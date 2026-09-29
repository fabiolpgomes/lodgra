import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStripe } from '@/lib/stripe/platform'
import { getBasePriceId, isExtraPropertyPriceId, isPaidPlan, toBillingCurrency } from '@/lib/billing/plans'
import { reconcileExtraProperties } from '@/lib/billing/extra-properties'
import { invalidateCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'

export const dynamic = 'force-dynamic'

// POST /api/organization/upgrade-plan { plan }
// Troca o preço base da assinatura e recalcula as propriedades adicionais
// (o número incluído e o preço do extra mudam com o plano).
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const supabase = createAdminClient()

  try {
    const { plan } = await request.json()
    if (!plan || !isPaidPlan(plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_plan, billing_currency')
      .eq('id', auth.organizationId)
      .single()

    if (orgError || !org?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Organização não tem subscrição ativa' }, { status: 400 })
    }
    if (org.subscription_plan === plan) {
      return NextResponse.json({ error: 'Já está no plano ' + plan }, { status: 400 })
    }

    const stripe = getPlatformStripe(toBillingCurrency(org.billing_currency))
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['items.data.price'],
    })
    const currency = toBillingCurrency(subscription.currency)
    const newPriceId = getBasePriceId(plan, currency)
    if (!newPriceId) {
      return NextResponse.json(
        { error: `Plano ${plan} não disponível em ${currency.toUpperCase()}. Configure o preço Stripe primeiro.` },
        { status: 400 }
      )
    }

    const baseItem = subscription.items.data.find(i => !isExtraPropertyPriceId((i.price as Stripe.Price).id))
    const items: Stripe.SubscriptionUpdateParams.Item[] = baseItem
      ? [{ id: baseItem.id, price: newPriceId }]
      : [{ price: newPriceId, quantity: 1 }]

    const updated = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items,
      proration_behavior: 'create_prorations',
    })
    const newBaseItem = updated.items.data.find(i => !isExtraPropertyPriceId((i.price as Stripe.Price).id))

    await supabase
      .from('organizations')
      .update({
        plan,
        subscription_plan: plan,
        stripe_subscription_item_id: newBaseItem?.id ?? null,
        billing_currency: currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.organizationId)

    const extras = await reconcileExtraProperties(auth.organizationId!)
    await invalidateCachedSubscriptionStatus(auth.organizationId!)

    if (!extras.ok) {
      console.error('[upgrade-plan] Plano trocado, mas extras não ajustados', extras.message)
      return NextResponse.json(
        { success: true, plan, warning: 'Plano alterado, mas as propriedades adicionais não foram ajustadas. Contacte o suporte.' },
        { status: 200 }
      )
    }
    return NextResponse.json({ success: true, plan, extra_properties: extras.extras ?? 0 })
  } catch (error: unknown) {
    console.error('[upgrade-plan] Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 })
  }
}
