import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  try {
    const body = await request.json()
    const { email, currency = 'brl', quantity = 1, plan } = body

    // ── Tier-based checkout (Starter / Professional / Business) ─────────────
    if (plan) {
      // Support currency-based price IDs (BRL, EUR, USD)
      const PLAN_PRICE_IDS_BY_CURRENCY: Record<string, Record<string, string | undefined>> = {
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

      // Fallback to EUR if currency not supported or prices missing
      const targetCurrency = PLAN_PRICE_IDS_BY_CURRENCY[currency] ? currency : 'eur'
      const currencyPrices = PLAN_PRICE_IDS_BY_CURRENCY[targetCurrency]!

      const priceId = currencyPrices[plan]
      console.log(`[Checkout] Plan: ${plan}, Requested Currency: ${currency}, Using: ${targetCurrency}`)
      console.log(`[Checkout] Selected PriceId: ${priceId}`)
      if (!priceId) {
        return NextResponse.json({
          error: `Plano ${plan} não disponível no momento. Tente novamente em breve.`
        }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        metadata: { source: 'landing_page', plan, currency },
      })

      return NextResponse.json({ url: session.url })
    }

    // ── Legacy per-property checkout (backward compat) ───────────────────────
    const PRICE_IDS: Record<string, string> = {
      brl: process.env.STRIPE_PRICE_ID_BRL!,
      eur: process.env.STRIPE_PRICE_ID_EUR!,
    }

    const priceId = PRICE_IDS[currency]
    if (!priceId) {
      return NextResponse.json({ error: 'Moeda inválida' }, { status: 400 })
    }

    const qty = Math.max(1, Math.floor(Number(quantity)))

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: qty }],
      customer_email: email || undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: {
        source: 'landing_page',
        currency,
        quantity: String(qty),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Erro ao criar sessão Stripe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
