import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function handleInvoiceEvent(
  event: Stripe.Event,
  adminClient: SupabaseClient
) {
  const invoice = event.data.object
  const customerId = invoice.customer

  const { data: org } = await adminClient
    .from('organizations')
    .select('id')
    .eq('stripe_br_customer_id', customerId)
    .single()

  if (!org) {
    console.warn(`[webhooks/invoice] Organization not found for customer: ${customerId}`)
    return
  }

  switch (event.type) {
    case 'invoice.created':
      console.log(`[webhooks/invoice] Invoice created: ${invoice.id}`)
      await adminClient
        .from('invoices')
        .insert({
          organization_id: org.id,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
          due_date: invoice.due_date
            ? new Date(invoice.due_date * 1000).toISOString()
            : null,
        })
      break

    case 'invoice.payment_succeeded':
      console.log(`[webhooks/invoice] Payment succeeded: ${invoice.id}`)
      await adminClient
        .from('organizations')
        .update({
          subscription_status: 'active',
        })
        .eq('id', org.id)

      await adminClient
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('stripe_invoice_id', invoice.id)
      break

    case 'invoice.payment_failed':
      console.log(`[webhooks/invoice] Payment failed: ${invoice.id}`)
      await adminClient
        .from('organizations')
        .update({
          subscription_status: 'past_due',
        })
        .eq('id', org.id)

      await adminClient
        .from('invoices')
        .update({
          status: 'past_due',
        })
        .eq('stripe_invoice_id', invoice.id)

      // TODO: Send past-due email alert
      console.log(`[webhooks/invoice] Past-due alert should be sent for org: ${org.id}`)
      break
  }

  await adminClient
    .from('stripe_events')
    .insert({
      organization_id: org.id,
      event_type: event.type,
      stripe_event_id: event.id,
      payload: invoice,
      processed_at: new Date().toISOString(),
    })
}
