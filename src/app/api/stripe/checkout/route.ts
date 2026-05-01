import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPerUnitPriceId, getMeteredPriceId } from '@/lib/billing/stripe-usage'

export const dynamic = 'force-dynamic'

const METERED_PLANS = ['growth', 'pro']

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  try {
    const body = await request.json()
    const { email, currency = 'eur', plan } = body

    if (!plan) {
      return NextResponse.json({ error: 'Plano obrigatório' }, { status: 400 })
    }

    if (plan === 'enterprise') {
      return NextResponse.json({ error: 'Enterprise requer contacto directo' }, { status: 400 })
    }

    const c = currency.toLowerCase()
    const planCurrency: 'eur' | 'brl' | 'usd' = c === 'brl' ? 'brl' : c === 'usd' ? 'usd' : 'eur'
    const priceId = getPerUnitPriceId(plan, planCurrency)

    if (!priceId) {
      return NextResponse.json({ error: 'Plano sem preço configurado — contacte suporte' }, { status: 400 })
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ]

    // Add metered price item for Growth and Pro plans
    if (METERED_PLANS.includes(plan)) {
      const meteredPriceId = getMeteredPriceId(plan, planCurrency)
      if (meteredPriceId) {
        lineItems.push({ price: meteredPriceId })
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: email || undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: { source: 'landing_page', plan, currency: planCurrency },
      subscription_data: {
        metadata: { plan, currency: planCurrency },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('[checkout] Erro ao criar sessão Stripe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
