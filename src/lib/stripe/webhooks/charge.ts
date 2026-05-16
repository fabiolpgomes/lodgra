import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function handleChargeEvent(
  event: Stripe.Event,
  adminClient: SupabaseClient
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const charge = event.data.object as any

  console.log(`[webhooks/charge] Event ${event.type}: ${charge.id}`)

  try {
    const bookingId = charge.metadata?.booking_id
    const orgId = charge.metadata?.org_id

    if (!bookingId) {
      console.log('[webhooks/charge] No booking_id in metadata, skipping')
      return
    }

    switch (event.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(charge, bookingId, orgId, adminClient)
        break

      case 'charge.failed':
        await handleChargeFailed(charge, bookingId, orgId, adminClient)
        break

      case 'charge.refunded':
        await handleChargeRefunded(charge, bookingId, orgId, adminClient)
        break

      default:
        console.log(`[webhooks/charge] Unhandled event type: ${event.type}`)
    }

    await adminClient.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[webhooks/charge] Error handling charge event:', error)
    throw error
  }
}

async function handleChargeSucceeded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  charge: any,
  bookingId: string,
  orgId: string,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/charge] Charge succeeded: ${charge.id}`)

  await adminClient
    .from('bookings')
    .update({
      payment_status: 'succeeded',
      stripe_charge_id: charge.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
}

async function handleChargeFailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  charge: any,
  bookingId: string,
  orgId: string,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/charge] Charge failed: ${charge.id}`)

  await adminClient
    .from('bookings')
    .update({
      payment_status: 'failed',
      stripe_charge_id: charge.id,
    })
    .eq('id', bookingId)
}

async function handleChargeRefunded(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  charge: any,
  bookingId: string,
  orgId: string,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/charge] Charge refunded: ${charge.id}`)

  const refundAmount = charge.amount_refunded || 0

  await adminClient
    .from('bookings')
    .update({
      payment_status: 'refunded',
      refund_amount: refundAmount / 100,
    })
    .eq('id', bookingId)

  await adminClient.from('refunds').insert({
    booking_id: bookingId,
    stripe_charge_id: charge.id,
    amount: refundAmount / 100,
    currency: charge.currency,
    reason: 'charge_refunded',
    status: 'completed',
  })
}
