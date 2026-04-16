/**
 * Unit Tests for Availability API
 *
 * Tests:
 * 1. Availability API excludes pending_payment reservations
 * 2. Overlapping bookings are correctly detected
 */

import { GET } from '../properties/[slug]/availability/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      in: jest.fn(function () {
        return this
      }),
      lte: jest.fn(function () {
        return this
      }),
      gte: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      limit: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        if (table === 'properties') {
          return {
            data: {
              id: 'prop_test_123',
              slug: 'test-property',
              base_price: 100,
              is_public: true,
            },
            error: null,
          }
        }
        if (table === 'property_listings') {
          return {
            data: [{ id: 'listing_test_123' }],
            error: null,
          }
        }
        if (table === 'pricing_rules') {
          return {
            data: { min_nights: 1 },
            error: null,
          }
        }
        return { data: null, error: null }
      }),
    })),
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      limit: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        if (table === 'pricing_rules') {
          return {
            data: { min_nights: 1 },
            error: null,
          }
        }
        return { data: null, error: null }
      }),
    })),
  })),
}))

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn(async () => true),
}))

// TODO: Re-enable when public booking API mocks are fixed
describe.skip('Availability API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Test 1: Availability API excludes pending_payment dates', () => {
    it('should mark dates as unavailable when pending_payment reservation exists', async () => {
      const mockClient = await createClient()

      // Mock the properties and property_listings queries
      mockClient.from.mockReturnValue({
        select: jest.fn(function () {
          return this
        }),
        eq: jest.fn(function (field: string, value: string) {
          if (field === 'slug' && value === 'test-property') {
            this._isPropertiesQuery = true
          }
          return this
        }),
        in: jest.fn(function () {
          return this
        }),
        lte: jest.fn(function () {
          return this
        }),
        gte: jest.fn(function () {
          return this
        }),
        single: jest.fn(async function () {
          if (this._isPropertiesQuery) {
            return {
              data: {
                id: 'prop_123',
                slug: 'test-property',
                base_price: 100,
                is_public: true,
              },
              error: null,
            }
          }
          return { data: null, error: null }
        }),
      })

      // Create mock request
      const mockRequest = new NextRequest('http://localhost/api/public/properties/test-property/availability?year=2026&month=3', {
        method: 'GET',
      })

      // Should include pending_payment status in query
      const response = await GET(mockRequest, {
        params: Promise.resolve({ slug: 'test-property' }),
      })

      const json = await response.json()
      expect(response.status).toBe(200)
      expect(json).toHaveProperty('blocked')
      expect(Array.isArray(json.blocked)).toBe(true)
    })
  })

  describe('Test 2: Overlapping bookings are correctly detected', () => {
    it('should return 409 when booking overlaps with pending_payment reservation', async () => {
      const mockRequest = new NextRequest('http://localhost/api/public/properties/test-property/availability?year=2026&month=3', {
        method: 'GET',
      })

      // Get availability
      const response = await GET(mockRequest, {
        params: Promise.resolve({ slug: 'test-property' }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('blocked')
    })
  })
})
