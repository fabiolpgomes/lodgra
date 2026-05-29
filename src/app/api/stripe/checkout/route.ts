import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPerUnitPriceId } from '@/lib/billing/stripe-usage'

export const dynamic = 'force-dynamic'

function getStripeKey(currency: string): string {
  const c = currency.toLowerCase()
  if (c === 'brl') return (process.env.STRIPE_BR_SECRET_KEY ?? '').trim()
  if (c === 'eur') return (process.env.STRIPE_PT_SECRET_KEY ?? '').trim()
  return (process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_BR_SECRET_KEY ?? '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, currency = 'eur', plan, source, locale } = body

    const stripeKey = getStripeKey(currency)
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 })
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-02-25.clover',
    })

    // Use request origin so success/cancel URLs always point to the correct domain
    // regardless of NEXT_PUBLIC_APP_URL env value (which may be stale in Vercel)
    const origin =
      request.headers.get('origin') ||
      request.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://lodgra.io'

    if (!plan) {
      return NextResponse.json({ error: 'Plano obrigatório' }, { status: 400 })
    }

    if (plan === 'enterprise') {
      return NextResponse.json({ error: 'Enterprise requer contacto directo' }, { status: 400 })
    }

    const c = currency.toLowerCase()
    const planCurrency: 'eur' | 'brl' | 'usd' = c === 'brl' ? 'brl' : c === 'usd' ? 'usd' : 'eur'

    // Get price ID based on plan and currency
    const priceId = getPerUnitPriceId(plan, planCurrency)

    if (!priceId) {
      return NextResponse.json({ error: 'Plano sem preço configurado — contacte suporte' }, { status: 400 })
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ]

    const isOnboarding = source === 'onboarding'
    const onboardingLocale = encodeURIComponent(locale ?? 'pt-BR')
    const successUrl = isOnboarding
      ? `${origin}/onboarding/ativado?session_id={CHECKOUT_SESSION_ID}&locale=${onboardingLocale}`
      : `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = isOnboarding
      ? `${origin}/${locale ?? 'pt-BR'}/onboarding/pendente`
      : `${origin}/`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { source: isOnboarding ? 'onboarding' : 'landing_page', plan, currency: planCurrency },
      subscription_data: {
        metadata: { plan, currency: planCurrency },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('[checkout] Erro ao criar sessão Stripe:', error)
    // Não expor erros internos do Stripe (price IDs, chaves) ao utilizador
    const isStripeError = error instanceof Error && (
      error.message.includes('No such price') ||
      error.message.includes('No such plan') ||
      error.message.includes('Invalid API Key') ||
      error.message.includes('sk_')
    )
    return NextResponse.json(
      { error: isStripeError ? 'Plano não disponível. Contacte o suporte.' : 'Erro ao iniciar checkout' },
      { status: 500 }
    )
  }
}
