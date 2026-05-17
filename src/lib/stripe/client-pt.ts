import Stripe from 'stripe'

let stripePTInstance: Stripe | null = null

export function getStripePT(): Stripe {
  if (!stripePTInstance) {
    const key = process.env.STRIPE_PT_SECRET_KEY?.trim()
    if (!key) {
      throw new Error('STRIPE_PT_SECRET_KEY is not defined in environment variables')
    }
    stripePTInstance = new Stripe(key, {
      maxNetworkRetries: 3,
      timeout: 30000,
    })
  }
  return stripePTInstance
}

// Lazy export for backward compatibility
export const stripePT = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripePT()[prop as keyof Stripe]
  },
}) as Stripe

export type StripePTClient = typeof stripePT
