import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  return new Stripe(key, { apiVersion: '2026-02-25.clover' })
}

// Returns the Stripe metered price ID for a given plan + currency.
// Growth: €1 per booking (usage = 1 per booking)
// Pro:    1% of revenue (usage = revenue_in_euros; price unit = €0.01)
export function getMeteredPriceId(plan: string, currency: 'eur' | 'brl' | 'usd' = 'eur'): string | null {
  const key = `STRIPE_PRICE_ID_${plan.toUpperCase()}_METERED_${currency.toUpperCase()}`
  return (process.env[key] ?? '').trim() || null
}

// Returns the per-unit licensed price ID for a given plan + currency.
export function getPerUnitPriceId(plan: string, currency: 'eur' | 'brl' | 'usd' = 'eur'): string | null {
  const key = `STRIPE_PRICE_ID_${plan.toUpperCase()}_${currency.toUpperCase()}`
  return (process.env[key] ?? '').trim() || null
}

interface OrgBillingInfo {
  plan: string
  stripeCustomerId: string | null
  stripeSubscriptionItemId: string | null
  billingUnitCount: number
}

async function getOrgBillingInfo(orgId: string): Promise<OrgBillingInfo | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('organizations')
    .select('subscription_plan, stripe_customer_id, stripe_subscription_item_id, billing_unit_count')
    .eq('id', orgId)
    .single()

  if (!data) return null

  return {
    plan: data.subscription_plan ?? 'starter',
    stripeCustomerId: data.stripe_customer_id ?? null,
    stripeSubscriptionItemId: data.stripe_subscription_item_id ?? null,
    billingUnitCount: data.billing_unit_count ?? 1,
  }
}

// Report one booking fee for Growth plan (€1 per booking via Stripe Billing Meter).
// No-op for starter/enterprise/pro.
export async function reportBookingFee(orgId: string): Promise<void> {
  const eventName = process.env.STRIPE_METER_EVENT_GROWTH
  if (!eventName) return

  const billing = await getOrgBillingInfo(orgId)
  if (!billing || billing.plan !== 'growth') return
  if (!billing.stripeCustomerId) return

  try {
    const stripe = getStripe()
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: billing.stripeCustomerId,
        value: '1',
      },
    })
  } catch (err) {
    // Non-blocking: billing meter event failure should not break reservation flow
    console.error('[stripe-usage] reportBookingFee failed:', err)
  }
}

// Report revenue for Pro plan (1% of revenue via Stripe Billing Meter).
// Meter price should be configured at €0.01/unit → reporting revenue_in_euros gives 1%.
export async function reportRevenueFee(orgId: string, revenueAmount: number): Promise<void> {
  const eventName = process.env.STRIPE_METER_EVENT_PRO
  if (!eventName) return

  const billing = await getOrgBillingInfo(orgId)
  if (!billing || billing.plan !== 'pro') return
  if (!billing.stripeCustomerId) return
  if (revenueAmount <= 0) return

  try {
    const stripe = getStripe()
    // Report revenue in whole euros (price unit = €0.01 → 1% fee)
    const units = Math.round(revenueAmount)
    if (units <= 0) return
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      payload: {
        stripe_customer_id: billing.stripeCustomerId,
        value: String(units),
      },
    })
  } catch (err) {
    console.error('[stripe-usage] reportRevenueFee failed:', err)
  }
}

// Sync property count with Stripe subscription quantity (base licensed item).
// Call this after a property is added or removed.
export async function syncSubscriptionQuantity(orgId: string): Promise<{ ok: boolean; count: number }> {
  const supabase = createAdminClient()

  const { count } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active')

  const propertyCount = Math.max(1, count ?? 1)

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_subscription_item_id, billing_unit_count')
    .eq('id', orgId)
    .single()

  if (!org?.stripe_subscription_item_id) {
    await supabase.from('organizations')
      .update({ billing_unit_count: propertyCount, updated_at: new Date().toISOString() })
      .eq('id', orgId)
    return { ok: true, count: propertyCount }
  }

  if (org.billing_unit_count === propertyCount) {
    return { ok: true, count: propertyCount }
  }

  try {
    const stripe = getStripe()
    await stripe.subscriptionItems.update(org.stripe_subscription_item_id, {
      quantity: propertyCount,
      proration_behavior: 'create_prorations',
    })

    await supabase.from('organizations')
      .update({ billing_unit_count: propertyCount, updated_at: new Date().toISOString() })
      .eq('id', orgId)

    return { ok: true, count: propertyCount }
  } catch (err) {
    console.error('[stripe-usage] syncSubscriptionQuantity failed:', err)
    return { ok: false, count: propertyCount }
  }
}
