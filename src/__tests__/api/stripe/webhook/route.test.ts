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
