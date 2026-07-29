import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

// TODO: Story 40.2 — Add requireRole('manager') middleware to validate only managers can submit decisions
// Currently: Security relies on token validation. Should add auth layer: @dev to implement in next phase

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { token, decision, refund_percentage, notes } = await request.json()

    if (!['APPROVED', 'PARTIAL', 'DENIED'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Validate token & fetch reservation
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*, properties(name)')
      .eq('id', id)
      .eq('review_token', token)
      .single()

    if (!reservation) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }

    // 2. Check token expiration
    const now = new Date()
    const expiresAt = new Date(reservation.review_token_expires_at)
    if (expiresAt < now) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 })
    }

    // 3. Validate reservation status
    if (reservation.status !== 'PENDING_MANUAL_REVIEW') {
      return NextResponse.json(
        { error: 'Reserva não está em manual review' },
        { status: 400 }
      )
    }

    // 4. Calculate refund amount
    const refundAmount = (reservation.total_amount * refund_percentage) / 100

    // Validate refund doesn't exceed total
    if (refundAmount > reservation.total_amount) {
      return NextResponse.json(
        { error: 'Refund amount exceeds reservation total' },
        { status: 422 }
      )
    }

    // 5. Process refund in Stripe if approved/partial
    let stripeRefundId: string | null = null

    if (['APPROVED', 'PARTIAL'].includes(decision) && refundAmount > 0) {
      try {
        const refundResponse = await fetch(
          new URL('/api/billing/refunds', request.url).toString(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reservation_id: id,
              amount: refundAmount,
              reason: 'serious_issue_resolved',
            }),
          }
        )

        const refundData = await refundResponse.json()
        if (refundResponse.ok) {
          stripeRefundId = refundData.stripe_refund_id || null
        } else {
          console.error('Stripe refund failed:', refundData.error)
          // Don't fail entirely - store attempt
        }
      } catch (error) {
        console.error('Error calling refund endpoint:', error)
        // Continue - can be retried
      }
    }

    // 6. Determine final status
    const finalStatus = ['APPROVED', 'PARTIAL'].includes(decision) ? 'REFUNDED' : 'DENIED'

    // 7. Update reservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: finalStatus,
        refund_amount: ['APPROVED', 'PARTIAL'].includes(decision) ? refundAmount : 0,
        stripe_refund_id: stripeRefundId,
        manual_review_notes: notes || null,
        reviewed_at: new Date().toISOString(),
        review_token: null, // Invalidate token
        review_token_expires_at: null,
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 8. Send email to guest with decision
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.guest_email,
          templateId: 'serious-issue-decision',
          data: {
            guest_name: reservation.guest_name,
            decision,
            refund_amount: refundAmount,
            refund_percentage,
            notes,
          },
        }),
      })
    } catch (error) {
      console.error('Failed to send decision email to guest:', error)
    }

    // 9. Send confirmation to manager
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'ahspropriedades@gmail.com',
          templateId: 'serious-issue-confirmation',
          data: {
            reservation_id: id,
            guest_name: reservation.guest_name,
            property_name: reservation.properties?.name || 'Unknown',
            decision,
            refund_amount: refundAmount,
            stripe_refund_id: stripeRefundId,
          },
        }),
      })
    } catch (error) {
      console.error('Failed to send confirmation email to manager:', error)
    }

    return NextResponse.json({
      success: true,
      reservation_id: id,
      status: finalStatus,
      refund_amount: refundAmount,
      refund_id: stripeRefundId,
    })
  } catch (error) {
    console.error('[admin/review/decision] POST error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar decisão' },
      { status: 500 }
    )
  }
}
