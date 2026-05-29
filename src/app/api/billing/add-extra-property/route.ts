import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { requireRole } from '@/lib/auth/requireRole'
import { checkBillingRateLimit } from '@/lib/middleware/rate-limit'
import type Stripe from 'stripe'

const EXTRA_PROPERTY_PRICE_ID = process.env.STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY

export async function POST(_request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    // Rate limiting: 5 req/min per user
    const userId = auth.userId || auth.organizationId || 'anonymous'
    const rateCheck = await checkBillingRateLimit(userId)

    if (!rateCheck.allowed) {
      console.warn(`[api/billing/add-extra-property] Rate limit exceeded for user: ${userId}`)
      return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded (5 req/min per user)' },
        { status: 429 }
      )
    }

    if (!auth.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    if (!EXTRA_PROPERTY_PRICE_ID) {
      console.error('[api/billing/add-extra-property] STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY not configured')
      return NextResponse.json(
        { error: 'Extra property pricing not configured' },
        { status: 500 }
      )
    }

    const adminClient = createAdminClient()

    // Get org subscription info
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id, subscription_plan, premium_extra_properties_count')
      .eq('id', auth.organizationId)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    const extraPropertyPlans = ['essencial', 'expansao', 'premium', 'starter', 'growth', 'professional', 'business', 'pro']
    if (!extraPropertyPlans.includes(org.subscription_plan)) {
      return NextResponse.json(
        { error: 'Extra properties are not available for this plan' },
        { status: 400 }
      )
    }

    // Get active subscription
    const subscriptions = await stripeBR.subscriptions.list({
      customer: org.stripe_br_customer_id,
      limit: 1,
    })

    const subscription = subscriptions.data[0]
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Add extra property line item to subscription
    const sub = subscription as Stripe.Subscription
    const updatedSubscription = await stripeBR.subscriptions.update(sub.id, {
      items: [
        ...sub.items.data.map((item: Stripe.SubscriptionItem) => ({
          id: item.id,
          // Keep existing items as-is
        })),
        {
          price: EXTRA_PROPERTY_PRICE_ID,
          quantity: 1,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    // Update org tracking
    const newExtraCount = (org.premium_extra_properties_count || 0) + 1
    await adminClient
      .from('organizations')
      .update({
        premium_extra_properties_count: newExtraCount,
      })
      .eq('id', auth.organizationId)

    console.log(
      `[billing/add-extra-property] Added extra property: org=${auth.organizationId}, count=${newExtraCount}, sub=${sub.id}`
    )

    const updated = updatedSubscription as Stripe.Subscription
    return NextResponse.json({
      success: true,
      subscription_id: updated.id,
      extra_properties_count: newExtraCount,
      status: updated.status,
      current_period_end: new Date((updated as unknown as Record<string, number>).current_period_end * 1000).toISOString(),
      items: updated.items.data.map((item: Stripe.SubscriptionItem) => ({
        price_id: item.price.id,
        quantity: item.quantity,
        amount: item.price.unit_amount,
      })),
    })
  } catch (error) {
    console.error('[billing/add-extra-property] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add extra property' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    if (!auth.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Get org subscription info
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id, premium_extra_properties_count')
      .eq('id', auth.organizationId)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
    }

    if ((org.premium_extra_properties_count || 0) === 0) {
      return NextResponse.json(
        { error: 'No extra properties to remove' },
        { status: 400 }
      )
    }

    // Get active subscription
    const subscriptions = await stripeBR.subscriptions.list({
      customer: org.stripe_br_customer_id,
      limit: 1,
    })

    const subscription = subscriptions.data[0]
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Find and remove the extra property item
    const sub = subscription as Stripe.Subscription
    const extraPropertyItem = sub.items.data.find(
      (item: Stripe.SubscriptionItem) => item.price.id === EXTRA_PROPERTY_PRICE_ID
    )

    if (!extraPropertyItem) {
      return NextResponse.json(
        { error: 'No extra property item found in subscription' },
        { status: 400 }
      )
    }

    const updatedSubscription = await stripeBR.subscriptions.update(sub.id, {
      items: sub.items.data
        .filter((item: Stripe.SubscriptionItem) => item.id !== extraPropertyItem.id)
        .map((item: Stripe.SubscriptionItem) => ({
          id: item.id,
        })),
      proration_behavior: 'create_prorations',
    })

    // Update org tracking
    const newExtraCount = Math.max(0, (org.premium_extra_properties_count || 1) - 1)
    await adminClient
      .from('organizations')
      .update({
        premium_extra_properties_count: newExtraCount,
      })
      .eq('id', auth.organizationId)

    console.log(
      `[billing/add-extra-property] Removed extra property: org=${auth.organizationId}, count=${newExtraCount}, sub=${sub.id}`
    )

    const updated = updatedSubscription as Stripe.Subscription
    return NextResponse.json({
      success: true,
      subscription_id: updated.id,
      extra_properties_count: newExtraCount,
      status: updated.status,
      current_period_end: new Date((updated as unknown as Record<string, number>).current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[billing/add-extra-property] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to remove extra property' },
      { status: 500 }
    )
  }
}
