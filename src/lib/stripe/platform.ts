import Stripe from 'stripe'

// Conta Stripe da plataforma Lodgra (assinaturas SaaS, BRL e EUR).
// Não confundir com contas dos tenants (ex.: STRIPE_PT_SECRET_KEY da AHS),
// que recebem os pagamentos das reservas diretas.
let instance: Stripe | null = null

export function getPlatformStripe(): Stripe {
  if (!instance) {
    const key = (process.env.STRIPE_SECRET_KEY ?? '').trim()
    if (!key) throw new Error('STRIPE_SECRET_KEY não configurada')
    instance = new Stripe(key, { apiVersion: '2026-02-25.clover', maxNetworkRetries: 2 })
  }
  return instance
}
