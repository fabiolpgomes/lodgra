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
    const customerId = subscription.customer as string

    // Find organization by stripe_customer_id or stripe_br_customer_id
    const { data: org } = await adminClient
      .from('organizations')
      .select('id')
      .or(`stripe_customer_id.eq.${customerId},stripe_br_customer_id.eq.${customerId}`)
      .single()

    if (!org) {
      console.warn(
        `[webhooks/stripe] Organization not found for customer: ${customerId}. Skipping update.`
      )
      return
    }

    // Get first subscription item to determine plan
    const firstItem = subscription.items.data[0]
    let plan = 'essencial'

    if (firstItem?.price?.id === process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL) {
      plan = 'essencial'
    } else if (firstItem?.price?.id === process.env.STRIPE_PRICE_ID_EXPANSAO_BRL) {
      plan = 'expansao'
    } else if (firstItem?.price?.id === process.env.STRIPE_PRICE_ID_PREMIUM_BRL) {
      plan = 'premium'
    }

    // Update organization with subscription details
    await adminClient
      .from('organizations')
      .update({
        stripe_customer_id: customerId,
        stripe_br_customer_id: customerId,
        subscription_id: subscription.id,
        plan,
        subscription_plan: plan,
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id)

    console.log(
      `[webhooks/stripe] Updated subscription: org=${org.id}, plan=${plan}, status=${subscription.status}`
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
