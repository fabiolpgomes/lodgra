import Stripe from 'stripe'

/**
 * Stripe Brasil Client
 * Gerencia subscriptions SaaS em Real (R$)
 * - Planos: Essencial (R$59), Expansão (R$89), Premium (R$130)
 * - Webhooks: /api/stripe/webhooks/billing
 *
 * Note: During build time, STRIPE_BR_SECRET_KEY may not be available.
 * This is expected - Vercel will provide it at runtime.
 */
const stripe = new Stripe(
  process.env.STRIPE_BR_SECRET_KEY || 'sk_test_dummy',
  {
    typescript: true,
  }
)

export default stripe

/**
 * Stripe Brasil Public Key (for client-side)
 * Usado em checkout e stripe.js initialization
 */
export const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || ''

/**
 * Webhook signature verification
 * IMPORTANTE: Usar STRIPE_BR_WEBHOOK_SECRET (Brasil SaaS)
 */
export const webhookSecret = process.env.STRIPE_BR_WEBHOOK_SECRET || ''
