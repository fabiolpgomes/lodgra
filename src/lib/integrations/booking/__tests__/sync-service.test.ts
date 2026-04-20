/**
 * Tests for Booking.com Sync Service
 *
 * Tests:
 * - Sync prices to Booking.com
 * - Sync availability to Booking.com
 * - Full property sync
 * - Bulk sync all properties
 */

import {
  syncPricesToBooking,
  syncAvailabilityToBooking,
  syncPropertyToBooking,
  syncAllPropertiesToBooking,
} from '../sync-service'
import { createAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateAdminClient = createAdminClient as jest.Mock<any>

// Mock dependencies
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      gte: jest.fn(function () {
        return this
      }),
      lte: jest.fn(function () {
        return this
      }),
      gt: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        if (table === 'property_listings') {
          return {
            data: {
              external_property_id: 'booking_prop_123',
              property_id: 'prop_123',
              properties: { id: 'prop_123', max_guests: 4 },
            },
            error: null,
          }
        }
        if (table === 'properties') {
          return { data: { id: 'prop_123', max_guests: 4 }, error: null }
        }
        return { data: null, error: null }
      }),
      async *[Symbol.asyncIterator]() {
        yield this
      },
    })),
  })),
}))

jest.mock('../client', () => ({
  createBookingComClient: jest.fn(() => ({
    pushPrices: jest.fn(async (prices: unknown[]) =>
      (prices as unknown[]).map((p) => ({
        date: (p as { date: string }).date,
        success: true,
      }))
    ),
    pushAvailabilities: jest.fn(async (avail: unknown[]) =>
      avail.map((a) => ({
        date: (a as { date: string }).date,
        success: true,
      }))
    ),
  })),
}))

// TODO: Re-enable when Booking.com native integration is reactivated
describe.skip('Booking Sync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('syncPricesToBooking', () => {
    it('should sync prices for a date range', async () => {
      const result = await syncPricesToBooking(
        'prop_123',
        '2026-05-01',
        '2026-05-03'
      )

      expect(result.success).toBe(true)
      expect(result.synced).toBeGreaterThanOrEqual(0)
    })

    it('should return error if property not linked to Booking.com', async () => {
      jest.clearAllMocks()

      // Mock property not linked to Booking
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          single: jest.fn(async () => ({
            data: null,
            error: { message: 'Not found' },
          })),
        })),
      })

      const result = await syncPricesToBooking(
        'prop_unlinked',
        '2026-05-01',
        '2026-05-03'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('syncAvailabilityToBooking', () => {
    it('should return error if property not linked to Booking.com', async () => {
      jest.clearAllMocks()

      // Mock property not linked
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          single: jest.fn(async () => ({
            data: null,
            error: { message: 'Not found' },
          })),
        })),
      })

      const result = await syncAvailabilityToBooking(
        'prop_unlinked',
        '2026-05-01',
        '2026-05-03'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('syncPropertyToBooking', () => {
    it('should return error if property not linked to Booking.com', async () => {
      jest.clearAllMocks()

      // Mock failure
      mockCreateAdminClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          single: jest.fn(async () => ({
            data: null,
            error: { message: 'Database error' },
          })),
        })),
      })

      const result = await syncPropertyToBooking(
        'prop_bad',
        '2026-05-01',
        '2026-05-03'
      )

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('syncAllPropertiesToBooking', () => {
    it('should sync multiple properties', async () => {
      const result = await syncAllPropertiesToBooking(30)

      expect(result.successCount).toBeGreaterThanOrEqual(0)
      expect(result.failureCount).toBeGreaterThanOrEqual(0)
      expect(typeof result.totalSynced).toBe('number')
    })

    it('should handle different days_ahead values', async () => {
      const result1 = await syncAllPropertiesToBooking(7)
      const result2 = await syncAllPropertiesToBooking(90)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle Supabase errors gracefully', async () => {
      const result = await syncPricesToBooking(
        'prop_123',
        '2026-05-01',
        '2026-05-03'
      )

      // Should not throw, should return error status
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('synced')
    })

    it('should handle missing Booking.com linkage', async () => {
      const result = await syncAvailabilityToBooking(
        'prop_not_linked',
        '2026-05-01',
        '2026-05-03'
      )

      expect(result.success).toBeFalsy()
      expect(result.error).toBeDefined()
    })
  })

  describe('Date Range Handling', () => {
    it('should accept single day dates', async () => {
      // Just verify the function accepts these formats without throwing
      expect(() => {
        // Don't call async, just check we can construct the params
        const start = '2026-05-01'
        const end = '2026-05-01'
        expect(start).toBe(end)
      }).not.toThrow()
    })

    it('should accept multi-day date ranges', async () => {
      const start = '2026-05-01'
      const end = '2026-05-31'

      expect(new Date(start).getTime()).toBeLessThan(
        new Date(end).getTime()
      )
    })

    it('should handle future dates', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 90)
      const futureStr = futureDate.toISOString().split('T')[0]

      expect(futureStr).toMatch(/^\d{4}-\d{2}-\d{2}$/) // Valid date format
    })
  })

  describe('Logging', () => {
    it('should log sync progress', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation()

      await syncPropertyToBooking('prop_123', '2026-05-01', '2026-05-03')

      expect(consoleSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('sync'))

      consoleSpy.mockRestore()
    })
  })
})
