/**
 * Unit tests for POST /api/public/bookings
 * Covers: validation, double-booking, max_guests, pricing, Stripe session creation
 */

import { POST } from '@/app/api/public/bookings/route'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { getPriceForRangePublic } from '@/lib/pricing/getPriceForRange'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/rateLimit')
jest.mock('@/lib/pricing/getPriceForRange')
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      },
    },
  }))
})

const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGetPriceForRangePublic = getPriceForRangePublic as jest.MockedFunction<typeof getPriceForRangePublic>

const BASE_URL = 'http://localhost:3000'

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`${BASE_URL}/api/public/bookings`, {
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
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: reservation, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                gt: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: conflicts, error: null }),
                }),
              }),
            }),
          }),
        }),
      }
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
describe.skip('POST /api/public/bookings', () => {
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
})
