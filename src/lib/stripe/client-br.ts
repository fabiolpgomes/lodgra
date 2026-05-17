import Stripe from 'stripe'

let stripeBRInstance: Stripe | null = null

export function getStripeBR(): Stripe {
  if (!stripeBRInstance) {
    const key = process.env.STRIPE_BR_SECRET_KEY?.trim()
    if (!key) {
      throw new Error('STRIPE_BR_SECRET_KEY is not defined in environment variables')
    }
    stripeBRInstance = new Stripe(key, {
      maxNetworkRetries: 3,
      timeout: 30000,
    })
  }
  return stripeBRInstance
}

// Lazy export for backward compatibility
export const stripeBR = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripeBR()[prop as keyof Stripe]
  },
}) as Stripe

export type StripeBRClient = typeof stripeBR
