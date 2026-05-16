import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  adminClient: SupabaseClient
) {
  const subscription = event.data.object
  const customerId = subscription.customer

  const { data: org } = await adminClient
    .from('organizations')
    .select('id')
    .eq('stripe_br_customer_id', customerId)
    .single()

  if (!org) {
    console.warn(`[webhooks/subscription] Organization not found for customer: ${customerId}`)
    return
  }

  switch (event.type) {
    case 'customer.subscription.created':
      console.log(`[webhooks/subscription] Subscription created: ${subscription.id}`)
      await adminClient
        .from('organizations')
        .update({
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          billing_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          billing_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('id', org.id)
      break

    case 'customer.subscription.updated':
      console.log(`[webhooks/subscription] Subscription updated: ${subscription.id}`)
      await adminClient
        .from('organizations')
        .update({
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          billing_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          billing_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
        .eq('id', org.id)
      break

    case 'customer.subscription.deleted':
      console.log(`[webhooks/subscription] Subscription deleted: ${subscription.id}`)
      await adminClient
        .from('organizations')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', org.id)
      break
  }

  await adminClient
    .from('stripe_events')
    .insert({
      organization_id: org.id,
      event_type: event.type,
      stripe_event_id: event.id,
      payload: subscription,
      processed_at: new Date().toISOString(),
    })
}
