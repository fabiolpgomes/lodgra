import Stripe from 'stripe'
import type { BillingCurrency } from '@/lib/billing/plans'

// Contas Stripe da plataforma Lodgra (assinaturas SaaS), uma por moeda:
//   brl → conta Brasil   (STRIPE_SECRET_KEY,    STRIPE_WEBHOOK_SECRET)
//   eur → conta Portugal (STRIPE_EU_SECRET_KEY, STRIPE_EU_WEBHOOK_SECRET)
// Não confundir com contas dos tenants (ex.: STRIPE_PT_SECRET_KEY da AHS),
// que recebem os pagamentos das reservas diretas.
const ENV: Record<BillingCurrency, { key: string; webhookSecret: string; connectWebhookSecret: string }> = {
  brl: { key: 'STRIPE_SECRET_KEY', webhookSecret: 'STRIPE_WEBHOOK_SECRET', connectWebhookSecret: 'STRIPE_CONNECT_WEBHOOK_SECRET' },
  eur: { key: 'STRIPE_EU_SECRET_KEY', webhookSecret: 'STRIPE_EU_WEBHOOK_SECRET', connectWebhookSecret: 'STRIPE_EU_CONNECT_WEBHOOK_SECRET' },
}

// Chaves publicáveis (usadas no navegador pelos componentes embutidos do Connect).
// Lidas explicitamente para o Next.js incluí-las no bundle do servidor.
const PUBLISHABLE: Record<BillingCurrency, string | undefined> = {
  brl: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  eur: process.env.NEXT_PUBLIC_STRIPE_EU_PUBLISHABLE_KEY,
}

export function getPlatformPublishableKey(currency: BillingCurrency): string {
  return (PUBLISHABLE[currency] ?? '').trim()
}

/** Segredo do endpoint de webhook de CONTAS CONECTADAS (eventos das reservas dos tenants). */
export function getConnectWebhookSecret(currency: BillingCurrency): string {
  return env(ENV[currency].connectWebhookSecret)
}

export const PLATFORM_CURRENCIES = Object.keys(ENV) as BillingCurrency[]

const instances = new Map<BillingCurrency, Stripe>()

function env(name: string): string {
  return (process.env[name] ?? '').trim()
}

export function isPlatformStripeConfigured(currency: BillingCurrency): boolean {
  return env(ENV[currency].key) !== ''
}

export function getPlatformStripe(currency: BillingCurrency): Stripe {
  const cached = instances.get(currency)
  if (cached) return cached
  const key = env(ENV[currency].key)
  if (!key) throw new Error(`${ENV[currency].key} não configurada`)
  const stripe = new Stripe(key, { apiVersion: '2026-02-25.clover', maxNetworkRetries: 2 })
  instances.set(currency, stripe)
  return stripe
}

export function getPlatformWebhookSecret(currency: BillingCurrency): string {
  return env(ENV[currency].webhookSecret)
}

/** Contas configuradas (chave presente), para operações que não sabem a moeda de antemão. */
export function configuredPlatformCurrencies(): BillingCurrency[] {
  return PLATFORM_CURRENCIES.filter(isPlatformStripeConfigured)
}
