jest.mock('stripe', () => jest.fn().mockImplementation((key: string) => ({ key })))

const ENV = process.env

function load() {
  let mod: typeof import('../platform')
  jest.isolateModules(() => { mod = require('../platform') })
  return mod!
}

afterEach(() => { process.env = ENV })

describe('contas Stripe da plataforma', () => {
  it('BRL usa STRIPE_SECRET_KEY e EUR usa STRIPE_EU_SECRET_KEY', () => {
    process.env = { ...ENV, STRIPE_SECRET_KEY: 'sk_br', STRIPE_EU_SECRET_KEY: 'sk_eu' }
    const { getPlatformStripe } = load()
    expect((getPlatformStripe('brl') as unknown as { key: string }).key).toBe('sk_br')
    expect((getPlatformStripe('eur') as unknown as { key: string }).key).toBe('sk_eu')
  })

  it('não usa a chave da AHS (STRIPE_PT_SECRET_KEY) para EUR', () => {
    process.env = { ...ENV, STRIPE_SECRET_KEY: 'sk_br', STRIPE_EU_SECRET_KEY: '', STRIPE_PT_SECRET_KEY: 'sk_ahs' }
    const { getPlatformStripe, isPlatformStripeConfigured, configuredPlatformCurrencies } = load()
    expect(isPlatformStripeConfigured('eur')).toBe(false)
    expect(configuredPlatformCurrencies()).toEqual(['brl'])
    expect(() => getPlatformStripe('eur')).toThrow('STRIPE_EU_SECRET_KEY')
  })

  it('webhook secret por moeda', () => {
    process.env = { ...ENV, STRIPE_WEBHOOK_SECRET: 'whsec_br', STRIPE_EU_WEBHOOK_SECRET: 'whsec_eu' }
    const { getPlatformWebhookSecret } = load()
    expect(getPlatformWebhookSecret('brl')).toBe('whsec_br')
    expect(getPlatformWebhookSecret('eur')).toBe('whsec_eu')
  })
})
