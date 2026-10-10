/**
 * Unit tests for POST /api/public/bookings
 * Covers: validation, double-booking, max_guests, pricing, Stripe session creation
 */

jest.mock('server-only', () => ({}))
import { NextRequest } from 'next/server'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { POST } from '@/app/api/public/bookings/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { getPriceForRangePublic } from '@/lib/pricing/getPriceForRange'

jest.mock('@/lib/supabase/admin')
const mockCanReceivePix = jest.fn()
const mockCreatePixCharge = jest.fn()
jest.mock('@/lib/payments/asaas-booking-pix.server', () => ({
  canReceivePix: (...args: unknown[]) => mockCanReceivePix(...args),
  createBookingPixCharge: (...args: unknown[]) => mockCreatePixCharge(...args),
  PixChargeError: class PixChargeError extends Error {
    constructor(message: string, readonly userMessage = 'Não foi possível gerar o Pix. Tente novamente.') {
      super(message)
    }
  },
}))
jest.mock('@/lib/rateLimit')
jest.mock('@/lib/pricing/getPriceForRange')
const mockCheckoutCreate = jest.fn().mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/pay/cs_test_123',
})
const mockResolveAccount = jest.fn()
jest.mock('@/lib/stripe/connect', () => ({
  resolveBookingPaymentAccount: (...args: unknown[]) => mockResolveAccount(...args),
}))

function connectAccount() {
  return {
    kind: 'connect',
    stripe: { checkout: { sessions: { create: mockCheckoutCreate } } },
    accountId: 'acct_tenant_1',
    platform: 'eur',
  }
}

const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGetPriceForRangePublic = getPriceForRangePublic as jest.MockedFunction<typeof getPriceForRangePublic>

const BASE_URL = 'http://localhost:3000'

beforeEach(() => {
  mockResolveAccount.mockResolvedValue(connectAccount())
})

function makeRequest(body: Record<string, unknown>): NextRequest {
  return createTestRequest(`${BASE_URL}/api/public/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  slug: 'villa-algarve',
  checkin: '2027-07-10',
  checkout: '2027-07-15',
  num_guests: 2,
  guest_name: 'João Silva',
  guest_email: 'joao@example.com',
  guest_phone: '+351 912 345 678',
  guest_country: 'PT',
}

const mockProperty = {
  id: 'prop-123',
  name: 'Villa Algarve',
  base_price: 100,
  currency: 'BRL',
  organization_id: 'org-001',
  is_public: true,
  max_guests: 6,
}

function buildMockSupabase(overrides: {
  property?: unknown
  listingIds?: { id: string }[]
  conflicts?: unknown[]
  directPlatform?: unknown
  existingListing?: unknown
  guestRecord?: unknown
  reservation?: unknown
} = {}) {
  const {
    property = mockProperty,
    listingIds = [{ id: 'listing-001' }],
    conflicts = [],
    directPlatform = { id: 'platform-direct' },
    existingListing = { id: 'listing-direct-123' },
    guestRecord = { id: 'guest-001' },
    reservation = { id: 'res-001' },
  } = overrides

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'properties') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: property, error: null }),
            }),
          }),
        }),
      }
    }
    if (table === 'property_listings') {
      // Two different query shapes:
      //   1) .select('id').eq('property_id', X)                         → awaited directly (listing IDs)
      //   2) .select('id').eq('property_id', X).eq('platform_id', Y).single() → chained (direct listing)
      // Distinguish them via column name in eq().
      const singleResult = { data: existingListing, error: null }
      const listingIdsResult = { data: listingIds, error: null }

      const makeEq: () => jest.Mock = () =>
        jest.fn().mockImplementation((col: string) => {
          if (col === 'platform_id') {
            // Second eq in direct-listing chain → return { single }
            return { single: jest.fn().mockResolvedValue(singleResult) }
          }
          // First eq ('property_id') → thenable so `await` works, AND has .eq for further chaining
          return {
            // Thenable: resolves when awaited (listing IDs query)
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(listingIdsResult).then(resolve),
            catch: (reject: (e: unknown) => unknown) => Promise.resolve(listingIdsResult).catch(reject),
            finally: (fn: () => void) => Promise.resolve(listingIdsResult).finally(fn),
            // Chainable: supports .eq('platform_id') for direct-listing query
            eq: jest.fn().mockImplementation(() => ({
              single: jest.fn().mockResolvedValue(singleResult),
            })),
          }
        })

      return {
        select: jest.fn().mockReturnValue({ eq: makeEq() }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'listing-new' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'platforms') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: directPlatform, error: null }),
          }),
        }),
      }
    }
    if (table === 'guests') {
      return {
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: guestRecord, error: null }),
          }),
        }),
      }
    }
    if (table === 'reservations') {
      const chainable = {} as any
      chainable.select = jest.fn().mockReturnValue(chainable)
      chainable.in = jest.fn().mockReturnValue(chainable)
      chainable.eq = jest.fn().mockReturnValue(chainable)
      chainable.gte = jest.fn().mockReturnValue(chainable)
      chainable.lt = jest.fn().mockReturnValue(chainable)
      chainable.gt = jest.fn().mockReturnValue(chainable)
      chainable.limit = jest.fn().mockResolvedValue({ data: conflicts, error: null })
      chainable.insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: reservation, error: null }),
        }),
      })
      chainable.update = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
      return chainable
    }
    if (table === 'organizations') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { plan: 'professional' }, error: null }),
          }),
        }),
      }
    }
    return { select: jest.fn(), insert: jest.fn(), update: jest.fn(), upsert: jest.fn() }
  })

  return { from: mockFrom } as unknown as ReturnType<typeof createAdminClient>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCheckRateLimit.mockReturnValue(true) // allowed by default
  mockGetPriceForRangePublic.mockResolvedValue({
    total: 500,
    breakdown: [],
    minNights: 1,
  })
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
})

// TODO: Re-enable when public booking API mocks are fixed
describe('POST /api/public/bookings', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(false)
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest({ slug: 'villa-algarve' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/obrigatórios/i)
  })

  it('returns 400 for invalid email', async () => {
    const req = makeRequest({ ...validBody, guest_email: 'not-an-email' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/email/i)
  })

  it('returns 400 when checkout is before checkin', async () => {
    const req = makeRequest({ ...validBody, checkin: '2027-07-15', checkout: '2027-07-10' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when checkin is in the past', async () => {
    const req = makeRequest({ ...validBody, checkin: '2020-01-01', checkout: '2020-01-05' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/passado/i)
  })

  it('returns 404 when property is not found or not public', async () => {
    const supabase = buildMockSupabase({ property: null })
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 when num_guests exceeds max_guests', async () => {
    const supabase = buildMockSupabase({ property: { ...mockProperty, max_guests: 2 } })
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeRequest({ ...validBody, num_guests: 5 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/máximo/i)
  })

  it('returns 409 when dates conflict with existing reservation', async () => {
    const supabase = buildMockSupabase({ conflicts: [{ id: 'existing-res' }] })
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 400 when totalAmount is 0 (property has no price configured)', async () => {
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    mockGetPriceForRangePublic.mockResolvedValue({ total: 0, breakdown: [], minNights: 1 })
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/preço/i)
  })

  it('returns 200 with checkout_url on successful booking', async () => {
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeRequest(validBody)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.checkout_url).toBeDefined()
    expect(json.reservation_id).toBeDefined()
  })

  it('uses dynamic pricing from getPriceForRangePublic for Stripe amount', async () => {
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    mockGetPriceForRangePublic.mockResolvedValue({ total: 750, breakdown: [], minNights: 2 })
    const req = makeRequest(validBody)
    await POST(req)
    expect(mockGetPriceForRangePublic).toHaveBeenCalledWith(
      mockProperty.id,
      expect.any(Date),
      expect.any(Date)
    )
  })

  it('cria o Checkout na conta Stripe do tenant (cobrança direta)', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'payment' }),
      { stripeAccount: 'acct_tenant_1' }
    )
  })

  it('responde 409 sem criar reserva quando o tenant não tem pagamento online ativo', async () => {
    mockResolveAccount.mockResolvedValue(null)
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    mockCheckoutCreate.mockClear()
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('online_payment_unavailable')
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it('valor abaixo do mínimo do Stripe → 400 com mensagem clara para o hóspede', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    mockCheckoutCreate.mockRejectedValueOnce(Object.assign(new Error('too small'), { code: 'amount_too_small' }))
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('amount_too_small')
    expect(json.message).toMatch(/mínimo/)
  })
})

describe('POST /api/public/bookings — Pix (Asaas)', () => {
  const pixBody = { ...validBody, payment_method: 'pix', guest_cpf_cnpj: '529.982.247-25' }
  const charge = {
    paymentId: 'pay_123',
    invoiceUrl: 'https://sandbox.asaas.com/i/123',
    status: 'PENDING',
    payload: '00020126580014br.gov.bcb.pix',
    encodedImage: 'aGVsbG8=',
  }

  beforeEach(() => {
    mockCanReceivePix.mockResolvedValue(true)
    mockCreatePixCharge.mockResolvedValue(charge)
  })

  it('recusa Pix (409) quando o tenant não pode receber Pix, sem tocar no Stripe', async () => {
    mockCanReceivePix.mockResolvedValue(false)
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest(pixBody))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('pix_unavailable')
    expect(mockCreatePixCharge).not.toHaveBeenCalled()
    expect(mockResolveAccount).not.toHaveBeenCalled()
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it('verifica o Pix com a organização e a moeda da propriedade', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    await POST(makeRequest(pixBody))
    expect(mockCanReceivePix).toHaveBeenCalledWith('org-001', 'BRL')
  })

  it('cria a cobrança Pix e devolve o QR Code, sem criar sessão no Stripe', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest(pixBody))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.payment_method).toBe('pix')
    expect(json.reservation_id).toBe('res-001')
    expect(json.pix.payload).toBe(charge.payload)
    expect(json.pix.encoded_image).toBe(charge.encodedImage)
    expect(json.pix.amount).toBe(500)
    expect(json.pix.currency).toBe('BRL')
    expect(new Date(json.pix.expires_at).getTime()).toBeGreaterThan(Date.now())
    expect(json.checkout_url).toBeUndefined()
    expect(mockCreatePixCharge).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-001', reservationId: 'res-001', totalAmount: 500, guestEmail: 'joao@example.com', guestCpfCnpj: '52998224725' }),
    )
    expect(mockCheckoutCreate).not.toHaveBeenCalled()
  })

  it.each([undefined, '', '111.111.111-11', '123'])('Pix sem CPF/CNPJ válido (%p) → 400 antes de criar a reserva', async (cpf) => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest({ ...pixBody, guest_cpf_cnpj: cpf }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_cpf_cnpj')
    expect(mockCreatePixCharge).not.toHaveBeenCalled()
  })

  it('falha ao criar a cobrança → 502 com mensagem para o hóspede', async () => {
    mockCreatePixCharge.mockRejectedValue(new Error('Asaas fora do ar'))
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest(pixBody))
    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.error).toBe('pix_charge_failed')
    expect(json.message).toMatch(/Pix/)
    expect(JSON.stringify(json)).not.toMatch(/Asaas fora do ar/)
  })

  it('sem payment_method continua a ser cartão (Stripe)', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    expect(mockCreatePixCharge).not.toHaveBeenCalled()
    expect(mockCheckoutCreate).toHaveBeenCalled()
  })
})
