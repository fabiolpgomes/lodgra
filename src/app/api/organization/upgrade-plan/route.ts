import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanFromPriceId } from '@/lib/billing/plans'

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

    if (!plan || !['starter', 'professional', 'business'].includes(plan)) {
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

    // Get new price ID based on current currency
    // Detect currency from current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    const currentPriceId = currentSubscription.items.data[0]?.price?.id

    // Determine currency from current price (BRL, EUR, USD)
    let currency = 'eur' // default
    if (currentPriceId?.includes('BRL') || process.env.STRIPE_PRICE_ID_STARTER_BRL?.includes(currentPriceId)) {
      currency = 'brl'
    } else if (process.env.STRIPE_PRICE_ID_STARTER_USD?.includes(currentPriceId)) {
      currency = 'usd'
    }

    // Map plan to price ID for detected currency
    const PLAN_PRICES: Record<string, Record<string, string | undefined>> = {
      brl: {
        starter:      process.env.STRIPE_PRICE_ID_STARTER_BRL,
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL_BRL,
        business:     process.env.STRIPE_PRICE_ID_BUSINESS_BRL,
      },
      eur: {
        starter:      process.env.STRIPE_PRICE_ID_STARTER_EUR,
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR,
        business:     process.env.STRIPE_PRICE_ID_BUSINESS_EUR,
      },
      usd: {
        starter:      process.env.STRIPE_PRICE_ID_STARTER_USD,
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL_USD,
        business:     process.env.STRIPE_PRICE_ID_BUSINESS_USD,
      },
    }

    const newPriceId = PLAN_PRICES[currency]?.[plan] as string | undefined
    if (!newPriceId) {
      return NextResponse.json(
        {
          error: `Plano ${plan} não disponível para ${currency}. Tente novamente em breve.`
        },
        { status: 400 }
      )
    }

    // Update subscription item with new price
    // Stripe handles proration automatically
    const updatedSubscription = await stripe.subscriptions.update(
      org.stripe_subscription_id,
      {
        items: [
          {
            id: currentSubscription.items.data[0]!.id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // Automatic prorating
      }
    )

    // Immediate invoice if upgrading (pro-rata charge)
    if (['professional', 'business'].includes(plan) &&
        !['professional', 'business'].includes(org.subscription_plan || '')) {
      // Upgrading: create invoice immediately
      const invoices = await stripe.invoices.list({
        subscription: org.stripe_subscription_id,
        limit: 1,
      })

      if (invoices.data.length > 0) {
        const invoice = invoices.data[0]
        if (invoice.status === 'draft') {
          await stripe.invoices.finalizeInvoice(invoice.id)
          await stripe.invoices.pay(invoice.id)
        }
      }
    }

    // Update plan in DB immediately (webhook will also update it)
    const newPlan = getPlanFromPriceId(newPriceId)
    await supabase
      .from('organizations')
      .update({ subscription_plan: newPlan, updated_at: new Date().toISOString() })
      .eq('id', auth.organizationId)

    return NextResponse.json({
      success: true,
      plan: newPlan,
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
