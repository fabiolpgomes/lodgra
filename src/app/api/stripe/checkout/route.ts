import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPriceIdForPlan, Plan } from '@/lib/billing/plans'

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
      const planCurrency = ['brl'].includes(currency.toLowerCase()) ? 'brl' : 'eur'
      const priceId = getPriceIdForPlan(plan as Plan, planCurrency)
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
