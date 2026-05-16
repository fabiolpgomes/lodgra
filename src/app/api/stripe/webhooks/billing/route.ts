import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStripeSignature } from '@/lib/stripe/verify-webhook'

const STRIPE_BR_WEBHOOK_SECRET = process.env.STRIPE_BR_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const body = await request.text()

  if (!signature) {
    console.error('[webhooks/billing] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const isValid = verifyStripeSignature(body, signature, STRIPE_BR_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('[webhooks/billing] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const adminClient = createAdminClient()

    console.log(`[webhooks/billing] Processing event: ${event.type} (${event.id})`)

    const { data: existingEvent } = await adminClient
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      console.log(`[webhooks/billing] Event already processed: ${event.id}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const customerId = event.data?.object?.customer
    if (!customerId) {
      console.warn(`[webhooks/billing] Event missing customer: ${event.type}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .eq('stripe_br_customer_id', customerId)
      .single()

    if (!org) {
      console.warn(
        `[webhooks/billing] Organization not found for customer: ${customerId}`
      )
      return NextResponse.json({ received: true }, { status: 200 })
    }

    await adminClient.from('stripe_events').insert({
      organization_id: org.id,
      event_type: event.type,
      stripe_event_id: event.id,
      payload: event.data.object,
      processed_at: new Date().toISOString(),
    })

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object
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
        await adminClient
          .from('organizations')
          .update({ subscription_status: 'canceled' })
          .eq('id', org.id)
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object
        await adminClient
          .from('organizations')
          .update({ subscription_status: 'active' })
          .eq('id', org.id)
        console.log(
          `[webhooks/billing] Invoice paid: ${invoice.id} (${invoice.amount_paid})`
        )
        break

      case 'invoice.payment_failed':
        console.warn(
          `[webhooks/billing] Invoice payment failed for org: ${org.id}`
        )
        await adminClient
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('id', org.id)
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[webhooks/billing] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
