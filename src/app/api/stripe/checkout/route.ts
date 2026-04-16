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
      const PLAN_PRICE_IDS: Record<string, string> = {
        starter:      process.env.STRIPE_PRICE_ID_STARTER_EUR!,
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR!,
        business:     process.env.STRIPE_PRICE_ID_BUSINESS_EUR!,
      }
      const priceId = PLAN_PRICE_IDS[plan]
      console.log(`[Checkout] Plan: ${plan}`)
      console.log(`[Checkout] PLAN_PRICE_IDS:`, {
        starter: process.env.STRIPE_PRICE_ID_STARTER_EUR ? '***' : 'MISSING',
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR ? '***' : 'MISSING',
        business: process.env.STRIPE_PRICE_ID_BUSINESS_EUR ? '***' : 'MISSING',
      })
      console.log(`[Checkout] Selected PriceId: ${priceId}`)
      if (!priceId) {
        return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        metadata: { source: 'landing_page', plan },
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
