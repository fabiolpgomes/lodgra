/**
 * Story 37.4: Reservation Cancellation Endpoint
 * POST: Cancel reservation, calculate refund, process via Stripe
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { calculateRefund } from '@/lib/cancellation/refund-calculator'
import { CancellationPolicySnapshot } from '@/types/cancellation.types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: reservationId } = params

  try {
    const supabase = createAdminClient()
    const body = await request.json()

    // Fetch reservation with policy snapshot
    const { data: reservation } = await supabase
      .from('reservations')
      .select('*, property_id, guest_id, total_amount, check_in, check_out, status, cancellation_policy_snapshot')
      .eq('id', reservationId)
      .single()

    if (!reservation) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Reservation already cancelled' },
        { status: 409 }
      )
    }

    // Get policy snapshot (should be captured at booking)
    const policySnapshot: CancellationPolicySnapshot | null = reservation.cancellation_policy_snapshot

    if (!policySnapshot) {
      return NextResponse.json(
        { success: false, error: 'No cancellation policy found for this reservation' },
        { status: 422 }
      )
    }

    // Calculate days until check-in
    const checkIn = new Date(reservation.check_in)
    const today = new Date()
    const daysUntilCheckIn = Math.ceil((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const duringStay = today >= checkIn

    // Determine stay duration
    const checkOut = new Date(reservation.check_out)
    const nightCount = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const stayDuration = nightCount >= 28 ? 'long' : 'short'

    // Calculate refund using policy
    const refundResult = calculateRefund({
      policy_type: policySnapshot.policy_type,
      stay_duration: stayDuration,
      days_until_checkin: daysUntilCheckIn,
      during_stay: duringStay,
      total_reservation_amount: reservation.total_amount,
    })

    // Validate refund amount
    if (refundResult.refund_amount > reservation.total_amount) {
      return NextResponse.json(
        { success: false, error: 'Calculated refund exceeds original amount' },
        { status: 422 }
      )
    }

    // Process Stripe refund (if applicable)
    let stripeRefundId: string | null = null

    if (refundResult.refund_amount > 0 && reservation.stripe_payment_intent_id) {
      try {
        const refundResponse = await fetch('/api/billing/refunds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: reservationId,
            amount: refundResult.refund_amount,
            reason: body.reason || 'Guest cancellation',
          }),
        })

        const refundData = await refundResponse.json()
        stripeRefundId = refundData.stripe_refund_id || null

        if (!refundResponse.ok && refundData.error) {
          throw new Error(`Stripe refund failed: ${refundData.error}`)
        }
      } catch (error) {
        console.error('Stripe refund error:', error)
        // Log but continue - refund can be retried
      }
    }

    // Update reservation status
    const { data: updated, error } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        refund_amount: refundResult.refund_amount,
        stripe_refund_id: stripeRefundId,
        refund_processed_at: new Date().toISOString(),
      })
      .eq('id', reservationId)
      .select()
      .single()

    if (error) throw error

    // Send cancellation email to guest
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reservation.guest_email,
          templateId: 'refund-processed',
          data: {
            guest_name: reservation.guest_name,
            property_name: reservation.property_name,
            refund_amount: refundResult.refund_amount,
            refund_percentage: refundResult.refund_percentage,
            reason: refundResult.reason,
          },
        }),
      })
    } catch (error) {
      console.error('Email send error:', error)
      // Log but don't fail the cancellation
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservationId,
      status: 'cancelled',
      refund_info: {
        refund_amount: refundResult.refund_amount,
        refund_percentage: refundResult.refund_percentage,
        stripe_refund_id: stripeRefundId,
        processed_at: updated.refund_processed_at,
      },
    })
  } catch (error) {
    console.error('Error cancelling reservation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to cancel reservation' },
      { status: 500 }
    )
  }
}
