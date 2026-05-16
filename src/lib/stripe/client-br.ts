import Stripe from 'stripe'

if (!process.env.STRIPE_BR_SECRET_KEY) {
  throw new Error('STRIPE_BR_SECRET_KEY is not defined in environment variables')
}

export const stripeBR = new Stripe(process.env.STRIPE_BR_SECRET_KEY, {
  maxNetworkRetries: 3,
  timeout: 30000,
})

export type StripeBRClient = typeof stripeBR
