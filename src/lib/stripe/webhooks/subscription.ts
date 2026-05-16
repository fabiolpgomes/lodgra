import { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import {
  onSubscriptionRenewal,
  onSubscriptionPastDue,
  onSubscriptionCanceled,
  onSubscriptionUpgraded,
} from '@/lib/billing/alerts'

export async function handleSubscriptionEvent(
  event: Stripe.Event,
  adminClient: SupabaseClient
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = event.data.object as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousSubscription = event.data.previous_attributes as any

  console.log(`[webhooks/subscription] Event ${event.type}: ${subscription.id}`)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(subscription, adminClient)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(subscription, previousSubscription, adminClient)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(subscription, adminClient)
        break

      default:
        console.log(`[webhooks/subscription] Unhandled event type: ${event.type}`)
    }

    // Record the event as processed
    await adminClient.from('stripe_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[webhooks/subscription] Error handling subscription event:', error)
    throw error
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/subscription] Handling created: ${subscription.id}`)

  // Update organization with subscription info
  await adminClient
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      subscription_plan: null,
    })
    .eq('stripe_br_customer_id', subscription.customer as string)
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  previousSubscription: Record<string, unknown> | undefined,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/subscription] Handling updated: ${subscription.id}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any
  const customerId = sub.customer as string
  const previousStatus = previousSubscription?.status as string | undefined
  const currentStatus = sub.status

  // Handle status changes
  if (previousStatus && previousStatus !== currentStatus) {
    if (currentStatus === 'active' && previousStatus === 'trialing') {
      // Trial ended and subscription became active
      await onSubscriptionRenewal({
        customerId,
        subscriptionId: sub.id,
        status: currentStatus,
        planName: 'Subscription',
        amount: sub.items.data[0]?.price?.unit_amount || 0,
        currency: sub.currency.toUpperCase(),
        renewalDate: new Date(sub.current_period_end * 1000).toLocaleDateString('pt-PT'),
      })
    } else if (currentStatus === 'past_due') {
      // Payment failed
      await onSubscriptionPastDue({
        customerId,
        subscriptionId: sub.id,
        status: currentStatus,
        planName: 'Subscription',
        amountDue: sub.items.data[0]?.price?.unit_amount || 0,
        currency: sub.currency.toUpperCase(),
        dueDate: sub.latest_invoice
          ? new Date((sub.latest_invoice as { due_date: number }).due_date * 1000).toLocaleDateString('pt-PT')
          : new Date().toLocaleDateString('pt-PT'),
      })
    } else if (currentStatus === 'canceled') {
      // Subscription cancelled
      await onSubscriptionCanceled({
        customerId,
        subscriptionId: sub.id,
        status: currentStatus,
        planName: 'Subscription',
        canceledDate: new Date().toLocaleDateString('pt-PT'),
      })
    }
  }

  // Handle plan upgrades/downgrades
  const previousItems = previousSubscription?.items as {
    data: Array<{ price: { id: string } }>
  } | undefined
  const currentItems = sub.items.data

  if (previousItems && previousItems.data.length > 0 && currentItems.length > 0) {
    const previousPriceId = previousItems.data[0].price.id
    const currentPriceId = currentItems[0].price?.id

    if (previousPriceId !== currentPriceId) {
      await onSubscriptionUpgraded({
        customerId,
        subscriptionId: sub.id,
        status: currentStatus,
        oldPlan: 'Previous Plan',
        newPlan: 'New Plan',
        newAmount: currentItems[0].price?.unit_amount || 0,
        currency: sub.currency.toUpperCase(),
        effectiveDate: new Date().toLocaleDateString('pt-PT'),
      })
    }
  }

  // Update organization
  await adminClient
    .from('organizations')
    .update({
      subscription_status: currentStatus,
    })
    .eq('stripe_br_customer_id', customerId)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  adminClient: SupabaseClient
) {
  console.log(`[webhooks/subscription] Handling deleted: ${subscription.id}`)

  await adminClient
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      subscription_plan: null,
    })
    .eq('stripe_br_customer_id', subscription.customer as string)
}
