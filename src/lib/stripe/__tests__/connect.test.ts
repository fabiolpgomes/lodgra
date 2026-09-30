import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStripe, isPlatformStripeConfigured } from '@/lib/stripe/platform'
import {
  ensureConnectedAccount,
  onboardingFromAccount,
  resolveBookingPaymentAccount,
  statusFromAccount,
  stripeForReservationPayment,
} from '../connect'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/stripe/platform')
jest.mock('../client-pt', () => ({ getStripePT: () => ({ legacy: true }) }))

type Org = {
  slug?: string
  stripe_connect_account_id: string | null
  stripe_connect_platform: string | null
  stripe_connect_status: string
}
let org: Org
let updates: Record<string, unknown>[]

const accountsCreate = jest.fn()
const accountsRetrieve = jest.fn()
const v1Retrieve = jest.fn()
const platformStripe = {
  accounts: { retrieve: v1Retrieve },
  v2: { core: { accounts: { create: accountsCreate, retrieve: accountsRetrieve } } },
}

function v1Account(o: { charges?: boolean; submitted?: boolean; due?: string[]; errors?: number }) {
  return {
    id: 'acct_t',
    charges_enabled: !!o.charges,
    details_submitted: !!o.submitted,
    requirements: {
      currently_due: o.due ?? [],
      past_due: [],
      errors: Array.from({ length: o.errors ?? 0 }, () => ({ code: 'verification_failed_keyed_identity' })),
    },
  } as unknown as Stripe.Account
}

function account(status: string | undefined, id = 'acct_1') {
  return { id, configuration: { merchant: { capabilities: { card_payments: status ? { status } : undefined } } } } as unknown as Stripe.V2.Core.Account
}

const ENV = process.env
beforeEach(() => {
  jest.clearAllMocks()
  process.env = { ...ENV }
  delete process.env.STRIPE_PT_SECRET_KEY
  org = { slug: 'outro-tenant', stripe_connect_account_id: null, stripe_connect_platform: null, stripe_connect_status: 'none' }
  updates = []
  ;(createAdminClient as jest.Mock).mockReturnValue({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: org }) }) }),
      update: (v: Record<string, unknown>) => ({ eq: async () => { updates.push(v); Object.assign(org, v); return { error: null } } }),
    }),
  })
  ;(getPlatformStripe as jest.Mock).mockReturnValue(platformStripe)
  ;(isPlatformStripeConfigured as jest.Mock).mockReturnValue(true)
})
afterAll(() => { process.env = ENV })

describe('statusFromAccount', () => {
  it('card_payments ativo → active; sem suporte → restricted; cadastro incompleto → pending', () => {
    expect(statusFromAccount(account('active'))).toBe('active')
    expect(statusFromAccount(account('unsupported'))).toBe('restricted')
    expect(statusFromAccount(account('restricted'))).toBe('pending')
    expect(statusFromAccount(account('pending'))).toBe('pending')
    expect(statusFromAccount(account(undefined))).toBe('pending')
  })
})

describe('onboardingFromAccount', () => {
  it('distingue por concluir, em análise, ativo e ação necessária', () => {
    expect(onboardingFromAccount(v1Account({ due: ['individual.first_name'] }))).toEqual({ status: 'pending', detailsSubmitted: false })
    expect(onboardingFromAccount(v1Account({ submitted: true }))).toEqual({ status: 'pending', detailsSubmitted: true })
    expect(onboardingFromAccount(v1Account({ submitted: true, charges: true }))).toEqual({ status: 'active', detailsSubmitted: true })
    expect(onboardingFromAccount(v1Account({ submitted: true, due: ['individual.dob.day'], errors: 1 }))).toEqual({ status: 'restricted', detailsSubmitted: true })
  })
})

describe('ensureConnectedAccount', () => {
  it('cria conta v2 com painel completo, taxas e perdas com o Stripe, na plataforma do país', async () => {
    accountsCreate.mockResolvedValue(account('pending', 'acct_new'))

    const result = await ensureConnectedAccount('org-1', { country: 'BR', email: 'a@b.com', displayName: 'Casa Azul' })

    expect(getPlatformStripe).toHaveBeenCalledWith('brl')
    const [params, options] = accountsCreate.mock.calls[0]
    expect(params).toMatchObject({
      dashboard: 'full',
      identity: { country: 'br' },
      defaults: { currency: 'brl', responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
    })
    expect(options).toEqual({ idempotencyKey: 'lodgra-connect-org-1' })
    expect(result).toEqual({ accountId: 'acct_new', platform: 'brl', status: 'pending' })
    expect(updates[0]).toMatchObject({ stripe_connect_account_id: 'acct_new', stripe_connect_platform: 'brl' })
  })

  it('Portugal/Europa vai para a plataforma EUR', async () => {
    accountsCreate.mockResolvedValue(account('pending'))
    await ensureConnectedAccount('org-1', { country: 'PT', email: 'a@b.com', displayName: 'X' })
    expect(getPlatformStripe).toHaveBeenCalledWith('eur')
  })

  it('não cria segunda conta se já existe', async () => {
    org.stripe_connect_account_id = 'acct_existing'
    org.stripe_connect_platform = 'eur'
    const result = await ensureConnectedAccount('org-1', { country: 'PT', email: 'a@b.com', displayName: 'X' })
    expect(accountsCreate).not.toHaveBeenCalled()
    expect(result.accountId).toBe('acct_existing')
  })

  it('país fora da lista é recusado', async () => {
    await expect(ensureConnectedAccount('org-1', { country: 'US', email: 'a@b.com', displayName: 'X' })).rejects.toThrow('country_not_supported')
  })
})

describe('resolveBookingPaymentAccount', () => {
  it('conta ativa → cobra na conta do tenant', async () => {
    Object.assign(org, { stripe_connect_account_id: 'acct_t', stripe_connect_platform: 'eur', stripe_connect_status: 'active' })
    await expect(resolveBookingPaymentAccount('org-1')).resolves.toMatchObject({ kind: 'connect', accountId: 'acct_t', platform: 'eur' })
  })

  it('cadastro recém-concluído: confirma no Stripe e passa a ativa', async () => {
    Object.assign(org, { stripe_connect_account_id: 'acct_t', stripe_connect_platform: 'brl', stripe_connect_status: 'pending' })
    v1Retrieve.mockResolvedValue(v1Account({ submitted: true, charges: true }))
    await expect(resolveBookingPaymentAccount('org-1')).resolves.toMatchObject({ kind: 'connect' })
    expect(updates[0]).toMatchObject({ stripe_connect_status: 'active' })
  })

  it('sem conta ativa e não é a AHS → sem pagamento online (nunca usa a chave da AHS)', async () => {
    process.env.STRIPE_PT_SECRET_KEY = 'sk_ahs'
    await expect(resolveBookingPaymentAccount('org-1')).resolves.toBeNull()
  })

  it('AHS sem conta conectada ainda usa a chave própria (transitório)', async () => {
    process.env.STRIPE_PT_SECRET_KEY = 'sk_ahs'
    org.slug = 'algarve-home-stay'
    await expect(resolveBookingPaymentAccount('org-1')).resolves.toMatchObject({ kind: 'legacy' })
  })
})

describe('stripeForReservationPayment', () => {
  it('reserva cobrada em conta conectada → opera com stripeAccount', async () => {
    const r = await stripeForReservationPayment({ stripe_account_id: 'acct_t', stripe_connect_platform: 'eur' })
    expect(getPlatformStripe).toHaveBeenCalledWith('eur')
    expect(r.options).toEqual({ stripeAccount: 'acct_t' })
  })

  it('reserva antiga → conta própria da AHS', async () => {
    const r = await stripeForReservationPayment({ stripe_account_id: null })
    expect(r.stripe).toEqual({ legacy: true })
    expect(r.options).toBeUndefined()
  })
})
