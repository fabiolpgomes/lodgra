import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripePT } from '@/lib/stripe/client-pt'
import { requireRole } from '@/lib/auth/requireRole'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { booking_id, amount_eur, reason } = await request.json()

    if (!booking_id) {
      return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
    }

    const validReasons = ['requested_by_customer', 'duplicate', 'fraudulent']
    if (reason && !validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid refund reason' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data: booking } = await adminClient
      .from('bookings')
      .select('stripe_charge_id, payment_amount, refund_amount')
      .eq('id', booking_id)
      .single()

    if (!booking?.stripe_charge_id) {
      return NextResponse.json(
        { error: 'Booking not found or no charge associated' },
        { status: 404 }
      )
    }

    const refundAmount = amount_eur ? Math.round(amount_eur * 100) : undefined
    const currentRefunded = (booking.refund_amount || 0) * 100
    const originalAmount = (booking.payment_amount || 0) * 100

    if (refundAmount && refundAmount + currentRefunded > originalAmount) {
      return NextResponse.json(
        { error: 'Refund amount exceeds original payment' },
        { status: 400 }
      )
    }

    const refund = await stripePT.refunds.create({
      charge: booking.stripe_charge_id,
      amount: refundAmount,
      reason: reason || 'requested_by_customer',
    })

    const refundedAmount = (refund.amount || 0) / 100

    await adminClient.from('refunds').insert({
      booking_id: booking_id,
      stripe_charge_id: booking.stripe_charge_id,
      amount: refundedAmount,
      currency: refund.currency,
      reason: reason || 'requested_by_customer',
      status: refund.status || 'succeeded',
      stripe_refund_id: refund.id,
    })

    await adminClient
      .from('bookings')
      .update({
        refund_amount: currentRefunded / 100 + refundedAmount,
      })
      .eq('id', booking_id)

    console.log(`[billing/refunds] Refund created: ${refund.id} for booking ${booking_id}`)

    return NextResponse.json({
      refund_id: refund.id,
      booking_id,
      amount_eur: refundedAmount,
      status: refund.status,
    })
  } catch (error) {
    console.error('[billing/refunds] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create refund' },
      { status: 500 }
    )
  }
}
