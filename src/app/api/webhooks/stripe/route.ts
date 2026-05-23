import { NextRequest, NextResponse } from 'next/server'
import { stripeBR } from '@/lib/stripe/client-br'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_BR!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !webhookSecret) {
    console.error('[webhooks/stripe] Missing signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripeBR.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('[webhooks/stripe] Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, adminClient)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, adminClient)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[webhooks/stripe] Invoice paid: ${invoice.id}`)
        break
      }

      default:
        console.log(`[webhooks/stripe] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[webhooks/stripe] Event processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    // Find organization by Stripe customer ID
    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .eq('stripe_br_customer_id', subscription.customer as string)
      .single()

    if (!org) {
      console.warn(
        `[webhooks/stripe] Organization not found for customer: ${subscription.customer}`
      )
      return
    }

    // Count extra property items in subscription
    // Extra properties are identified by price ID
    const EXTRA_PROPERTY_PRICE_ID = process.env.STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY

    const extraPropertyCount = subscription.items.data.filter(
      (item: Stripe.SubscriptionItem) => item.price.id === EXTRA_PROPERTY_PRICE_ID
    ).length

    // Update organization with current extra property count
    await adminClient
      .from('organizations')
      .update({
        premium_extra_properties_count: extraPropertyCount,
      })
      .eq('id', org.id)

    console.log(
      `[webhooks/stripe] Updated subscription: org=${org.id}, extra_properties=${extraPropertyCount}, status=${subscription.status}`
    )
  } catch (error) {
    console.error('[webhooks/stripe] handleSubscriptionUpdated error:', error)
    throw error
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .eq('stripe_br_customer_id', subscription.customer as string)
      .single()

    if (!org) {
      console.warn(
        `[webhooks/stripe] Organization not found for customer: ${subscription.customer}`
      )
      return
    }

    // Reset extra properties when subscription is canceled
    await adminClient
      .from('organizations')
      .update({
        premium_extra_properties_count: 0,
      })
      .eq('id', org.id)

    console.log(
      `[webhooks/stripe] Subscription deleted: org=${org.id}, reset extra_properties=0`
    )
  } catch (error) {
    console.error('[webhooks/stripe] handleSubscriptionDeleted error:', error)
    throw error
  }
}
