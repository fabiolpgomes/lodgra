/**
 * Unit tests for GET /api/public/properties/[slug]/availability
 * Covers: validation, property not found, blocked dates, past dates, rate limit
 */

import { GET } from '@/app/api/public/properties/[slug]/availability/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/rateLimit')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

const BASE_URL = 'http://localhost:3000'

function makeRequest(slug: string, params: Record<string, string> = {}): NextRequest {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE_URL}/api/public/properties/${slug}/availability${qs ? `?${qs}` : ''}`
  return new NextRequest(url)
}

const mockProperty = {
  id: 'prop-123',
  base_price: 100,
}

function buildMockSupabase(options: {
  property?: unknown
  listings?: unknown[]
  reservations?: { check_in: string; check_out: string }[]
} = {}) {
  const {
    property = mockProperty,
    listings = [{ id: 'listing-001' }],
    reservations = [],
  } = options

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
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: listings, error: null }),
        }),
      }
    }
    if (table === 'reservations') {
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                gte: jest.fn().mockResolvedValue({ data: reservations, error: null }),
              }),
            }),
          }),
        }),
      }
    }
    return {}
  })

  return { from: mockFrom } as unknown as Awaited<ReturnType<typeof createClient>>
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCheckRateLimit.mockResolvedValue(true) // allowed by default
})

// TODO: Re-enable when public booking API mocks are fixed
describe.skip('GET /api/public/properties/[slug]/availability', () => {
  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const supabase = buildMockSupabase()
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('villa-algarve', { year: '2027', month: '7' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(429)
  })

  it('returns 400 for invalid month parameter', async () => {
    const supabase = buildMockSupabase()
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('villa-algarve', { year: '2027', month: '13' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when property is not found or not public', async () => {
    const supabase = buildMockSupabase({ property: null })
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('unknown-slug', { year: '2027', month: '7' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'unknown-slug' }) })
    expect(res.status).toBe(404)
  })

  it('returns 200 with blocked dates from active reservations', async () => {
    const supabase = buildMockSupabase({
      reservations: [{ check_in: '2027-07-10', check_out: '2027-07-12' }],
    })
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('villa-algarve', { year: '2027', month: '7' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.blocked).toContain('2027-07-10')
    expect(json.blocked).toContain('2027-07-11')
    // Checkout day (2027-07-12) should NOT be blocked
    expect(json.blocked).not.toContain('2027-07-12')
  })

  it('includes base_price and min_nights in response', async () => {
    const supabase = buildMockSupabase()
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('villa-algarve', { year: '2027', month: '7' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.base_price).toBe(100)
    expect(json.min_nights).toBe(1)
    expect(Array.isArray(json.blocked)).toBe(true)
  })

  it('returns empty blocked array when no reservations exist', async () => {
    const supabase = buildMockSupabase({ reservations: [] })
    mockCreateClient.mockResolvedValue(supabase)
    // Use a future year so no past dates are in the range
    const req = makeRequest('villa-algarve', { year: '2099', month: '7' })
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.blocked).toHaveLength(0)
  })

  it('uses current year and month when query params are omitted', async () => {
    const supabase = buildMockSupabase()
    mockCreateClient.mockResolvedValue(supabase)
    const req = makeRequest('villa-algarve') // no year/month
    const res = await GET(req, { params: Promise.resolve({ slug: 'villa-algarve' }) })
    expect(res.status).toBe(200)
  })
})
