/**
 * POST /api/stripe/webhook (assinaturas Lodgra) — idempotência por event.id.
 */
import { createTestRequest } from '@/__tests__/utils/test-request'
import { POST } from '@/app/api/stripe/webhook/route'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  claimStripeEvent,
  markStripeEventProcessed,
  releaseStripeEvent,
} from '@/lib/stripe/webhook-idempotency'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/cache/profileCache', () => ({ invalidateCachedProfile: jest.fn() }))
jest.mock('@/lib/cache/subscriptionCache', () => ({ invalidateCachedSubscriptionStatus: jest.fn() }))
jest.mock('@/lib/auth/create-user-profile', () => ({ createUserProfile: jest.fn() }))
jest.mock('@/lib/billing/extra-properties', () => ({ reconcileExtraProperties: jest.fn() }))
jest.mock('@/lib/stripe/webhook-idempotency', () => ({
  claimStripeEvent: jest.fn(),
  markStripeEventProcessed: jest.fn(),
  releaseStripeEvent: jest.fn(),
}))

const mockConstructEvent = jest.fn()
jest.mock('stripe', () => jest.fn().mockImplementation(() => ({ webhooks: { constructEvent: mockConstructEvent } })))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockClaim = claimStripeEvent as jest.MockedFunction<typeof claimStripeEvent>
const mockMarkProcessed = markStripeEventProcessed as jest.MockedFunction<typeof markStripeEventProcessed>
const mockRelease = releaseStripeEvent as jest.MockedFunction<typeof releaseStripeEvent>

function request() {
  return createTestRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST', headers: { 'stripe-signature': 'sig' }, body: '{}',
  })
}

function supabaseWithOrgUpdate(error: unknown = null) {
  const select = jest.fn().mockResolvedValue({ data: error ? null : [{ id: 'org-1' }], error })
  const eq = jest.fn().mockReturnValue({ select })
  const update = jest.fn().mockReturnValue({ eq })
  return { from: jest.fn().mockReturnValue({ update }) } as unknown as ReturnType<typeof createAdminClient>
}

const deletedEvent = { id: 'evt_sub_del', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  mockClaim.mockResolvedValue('claimed')
})

describe('POST /api/stripe/webhook — idempotência', () => {
  it('processa e marca o evento como processado', async () => {
    mockConstructEvent.mockReturnValue(deletedEvent)
    const supabase = supabaseWithOrgUpdate()
    mockCreateAdminClient.mockReturnValue(supabase)
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(supabase.from).toHaveBeenCalledWith('organizations')
    expect(mockClaim).toHaveBeenCalledWith(supabase, 'platform', deletedEvent)
    expect(mockMarkProcessed).toHaveBeenCalledWith(supabase, 'evt_sub_del')
  })

  it('ignora evento já processado com 200', async () => {
    mockConstructEvent.mockReturnValue(deletedEvent)
    mockClaim.mockResolvedValue('duplicate')
    const supabase = supabaseWithOrgUpdate()
    mockCreateAdminClient.mockReturnValue(supabase)
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(supabase.from).not.toHaveBeenCalled()
    expect(mockMarkProcessed).not.toHaveBeenCalled()
  })

  it('responde 409 quando o evento está em processamento', async () => {
    mockConstructEvent.mockReturnValue(deletedEvent)
    mockClaim.mockResolvedValue('in_progress')
    const supabase = supabaseWithOrgUpdate()
    mockCreateAdminClient.mockReturnValue(supabase)
    const res = await POST(request())
    expect(res.status).toBe(409)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('libera o evento e responde 500 quando o processamento lança erro', async () => {
    mockConstructEvent.mockReturnValue(deletedEvent)
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = { from: jest.fn(() => { throw new Error('db down') }) } as unknown as ReturnType<typeof createAdminClient>
    mockCreateAdminClient.mockReturnValue(supabase)
    const res = await POST(request())
    expect(res.status).toBe(500)
    expect(mockRelease).toHaveBeenCalledWith(supabase, 'evt_sub_del')
    expect(mockMarkProcessed).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe('customer.subscription.updated — plano e moeda', () => {
  const ENV = process.env
  beforeEach(() => {
    process.env = {
      ...ENV,
      STRIPE_SECRET_KEY: 'sk_test_dummy',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_PRICE_ID_PREMIUM_EUR: 'price_premium_eur',
      STRIPE_PRICE_ID_EXTRA_PROPERTY_EUR: 'price_extra_eur',
    }
  })
  afterAll(() => { process.env = ENV })

  function updatedEvent(prices: string[]) {
    return {
      id: 'evt_sub_upd',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          status: 'active',
          currency: 'eur',
          items: { data: prices.map((id, i) => ({ id: `si_${i}`, price: { id } })) },
        },
      },
    }
  }

  function supabaseCapturingUpdate() {
    const updates: Record<string, unknown>[] = []
    const select = jest.fn().mockResolvedValue({ data: [{ id: 'org-1' }], error: null })
    const eq = jest.fn().mockReturnValue({ select })
    const update = jest.fn((values: Record<string, unknown>) => { updates.push(values); return { eq } })
    return { client: { from: jest.fn().mockReturnValue({ update }) } as unknown as ReturnType<typeof createAdminClient>, updates }
  }

  it('usa o item base (não o de propriedade adicional) para o plano e grava a moeda', async () => {
    mockConstructEvent.mockReturnValue(updatedEvent(['price_extra_eur', 'price_premium_eur']))
    const { client, updates } = supabaseCapturingUpdate()
    mockCreateAdminClient.mockReturnValue(client)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({
      subscription_plan: 'premium',
      plan: 'premium',
      billing_currency: 'eur',
      stripe_subscription_item_id: 'si_1',
    })
  })

  it('preço desconhecido não rebaixa o plano', async () => {
    mockConstructEvent.mockReturnValue(updatedEvent(['price_desconhecido']))
    const { client, updates } = supabaseCapturingUpdate()
    mockCreateAdminClient.mockReturnValue(client)

    await POST(request())

    expect(updates[0]).not.toHaveProperty('subscription_plan')
    expect(updates[0]).not.toHaveProperty('plan')
    expect(updates[0]).toMatchObject({ subscription_status: 'active', billing_currency: 'eur' })
  })
})


describe('POST /api/stripe/webhook — duas contas da plataforma (BRL e EUR)', () => {
  const ENV = process.env
  beforeEach(() => {
    process.env = {
      ...ENV,
      STRIPE_SECRET_KEY: 'sk_test_br',
      STRIPE_WEBHOOK_SECRET: 'whsec_br',
      STRIPE_EU_SECRET_KEY: 'sk_test_eu',
      STRIPE_EU_WEBHOOK_SECRET: 'whsec_eu',
    }
  })
  afterAll(() => { process.env = ENV })

  it('aceita evento assinado pela conta EUR', async () => {
    mockConstructEvent.mockImplementation((_body: string, _sig: string, secret: string) => {
      if (secret !== 'whsec_eu') throw new Error('No signatures found matching the expected signature')
      return deletedEvent
    })
    mockCreateAdminClient.mockReturnValue(supabaseWithOrgUpdate())

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(mockConstructEvent).toHaveBeenCalledWith('{}', 'sig', 'whsec_br')
    expect(mockConstructEvent).toHaveBeenCalledWith('{}', 'sig', 'whsec_eu')
  })

  it('rejeita com 400 quando nenhuma conta reconhece a assinatura', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('bad signature') })
    const supabase = supabaseWithOrgUpdate()
    mockCreateAdminClient.mockReturnValue(supabase)

    const res = await POST(request())

    expect(res.status).toBe(400)
    expect(mockClaim).not.toHaveBeenCalled()
  })
})
