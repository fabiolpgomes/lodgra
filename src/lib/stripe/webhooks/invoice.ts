import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function handleInvoiceEvent(
  event: Stripe.Event,
  _adminClient: SupabaseClient
) {
  // TODO: Implement invoice event handling (Story 12.2)
  const invoice = event.data.object as Stripe.Invoice
  console.log(`[webhooks/invoice] Event ${event.type}: ${invoice.id}`)
}
