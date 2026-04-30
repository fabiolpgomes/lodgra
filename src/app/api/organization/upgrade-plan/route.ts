import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanFromPriceId } from '@/lib/billing/plans'
import { getPerUnitPriceId, getMeteredPriceId } from '@/lib/billing/stripe-usage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Only admins can change subscription
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const supabase = createAdminClient()

  try {
    const body = await request.json()
    const { plan } = body

    const validPlans = ['starter', 'growth', 'pro', 'professional', 'business']
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      )
    }

    // Get current org subscription
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, stripe_customer_id, subscription_plan')
      .eq('id', auth.organizationId)
      .single()

    if (orgError || !org?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Organização não tem subscrição ativa' },
        { status: 400 }
      )
    }

    // Prevent downgrading to same plan
    if (org.subscription_plan === plan) {
      return NextResponse.json(
        { error: 'Já está no plano ' + plan },
        { status: 400 }
      )
    }

    // Retrieve current subscription + detect currency from existing base item
    const currentSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['items.data.price'],
    })

    // Separate base item from metered item
    let baseItem: Stripe.SubscriptionItem | null = null
    const meteredItems: Stripe.SubscriptionItem[] = []

    for (const item of currentSubscription.items.data) {
      const price = item.price as Stripe.Price
      if (price.recurring?.usage_type === 'metered') {
        meteredItems.push(item)
      } else {
        baseItem = item
      }
    }

    // Detect currency from base price ID
    let planCurrency: 'eur' | 'brl' | 'usd' = 'eur'
    const basePriceId = baseItem?.price?.id ?? ''
    const brlPrices = [
      process.env.STRIPE_PRICE_ID_STARTER_BRL,
      process.env.STRIPE_PRICE_ID_GROWTH_BRL,
      process.env.STRIPE_PRICE_ID_PRO_BRL,
    ]
    const usdPrices = [
      process.env.STRIPE_PRICE_ID_STARTER_USD,
      process.env.STRIPE_PRICE_ID_GROWTH_USD,
      process.env.STRIPE_PRICE_ID_PRO_USD,
    ]
    if (brlPrices.includes(basePriceId)) planCurrency = 'brl'
    else if (usdPrices.includes(basePriceId)) planCurrency = 'usd'

    const newPriceId = getPerUnitPriceId(plan, planCurrency)
    if (!newPriceId) {
      return NextResponse.json(
        { error: `Plano ${plan} não disponível. Configure o preço Stripe primeiro.` },
        { status: 400 }
      )
    }

    // Build subscription update: swap base item price, handle metered items
    const METERED_PLANS = ['growth', 'pro']
    const itemUpdates: Stripe.SubscriptionUpdateParams.Item[] = []

    // Update base price
    if (baseItem) {
      itemUpdates.push({ id: baseItem.id, price: newPriceId })
    } else {
      itemUpdates.push({ price: newPriceId, quantity: 1 })
    }

    // Remove existing metered items (will add new ones if needed)
    for (const mi of meteredItems) {
      itemUpdates.push({ id: mi.id, deleted: true })
    }

    // Add metered item for new plan if needed
    if (METERED_PLANS.includes(plan)) {
      const meteredPriceId = getMeteredPriceId(plan, planCurrency)
      if (meteredPriceId) {
        itemUpdates.push({ price: meteredPriceId })
      }
    }

    const updatedSubscription = await stripe.subscriptions.update(
      org.stripe_subscription_id,
      {
        items: itemUpdates,
        proration_behavior: 'create_prorations',
      }
    )

    // Re-derive item IDs from updated subscription
    let newBaseItemId: string | null = null
    let newMeteredItemId: string | null = null
    for (const item of updatedSubscription.items.data) {
      const price = item.price as Stripe.Price
      if (price.recurring?.usage_type === 'metered') {
        newMeteredItemId = item.id
      } else {
        newBaseItemId = item.id
      }
    }

    await supabase
      .from('organizations')
      .update({
        subscription_plan: plan,
        stripe_subscription_item_id: newBaseItemId,
        stripe_metered_item_id: newMeteredItemId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.organizationId)

    return NextResponse.json({
      success: true,
      plan,
      subscription_id: updatedSubscription.id,
    })
  } catch (error: unknown) {
    console.error('[upgrade-plan] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao atualizar plano'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
