import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  _adminClient: SupabaseClient
) {
  // TODO: Implement subscription event handling (Story 12.2)
  const subscription = event.data.object as Stripe.Subscription
  console.log(`[webhooks/subscription] Event ${event.type}: ${subscription.id}`)
}
