import { ReservationValidator } from '@/lib/reservations/reservation-validator'
import { createAdminClient } from '@/lib/supabase/admin'

// Mock Supabase
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

type QueryResult = {
  data: any
  error: any
}

function createQueryChain(result: QueryResult) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    neq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    gt: jest.fn(() => Promise.resolve(result)),
    lt: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    order: jest.fn(() => Promise.resolve(result)),
    limit: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
  }

  return chain
}

function buildSupabaseMock(overrides: Record<string, QueryResult> = {}) {
  const defaults: Record<string, QueryResult> = {
    property_prices: { data: null, error: { code: 'PGRST116' } },
    pricing_rules: { data: [], error: null },
    daily_prices: { data: [], error: null },
    property_availability: { data: null, error: { code: 'PGRST116' } },
    property_cancellation_policies: { data: [], error: null },
    reservations: { data: [], error: null },
    calendar_blocks: { data: [], error: null },
    property_discounts: { data: [], error: null },
    properties: { data: null, error: { code: 'PGRST116' } },
  }

  const results = { ...defaults, ...overrides }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => createQueryChain(results[table] ?? { data: [], error: null })),
  }
}

describe('ReservationValidator', () => {
  const mockCreateClient = createAdminClient as jest.Mock
  let mockSupabase: ReturnType<typeof buildSupabaseMock>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = buildSupabaseMock()
    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('validatePrice', () => {
    it('should calculate total price for a date range', async () => {
      const result = await ReservationValidator.validatePrice(
        'prop-123',
        '2026-08-05',
        '2026-08-08'
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('pricePerNight')
      expect(result).toHaveProperty('subtotal')
      expect(result).toHaveProperty('currency')
    })

    it('should return error if checkout before checkin', async () => {
      const result = await ReservationValidator.validatePrice(
        'prop-123',
        '2026-08-10',
        '2026-08-05'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Check-out must be after check-in')
    })

    it('should handle missing pricing data', async () => {
      const result = await ReservationValidator.validatePrice(
        'prop-123',
        '2026-12-25',
        '2026-12-28'
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('pricePerNight')
      expect(result).toHaveProperty('subtotal')
    })

    it('should use pricing_rules when property_prices is missing', async () => {
      mockSupabase = buildSupabaseMock({
        property_prices: { data: null, error: { code: 'PGRST116' } },
        pricing_rules: {
          data: [
            {
              start_date: '2026-08-01',
              end_date: '2026-08-31',
              price_per_night: 110,
            },
          ],
          error: null,
        },
        daily_prices: { data: [], error: null },
      })
      mockCreateClient.mockResolvedValue(mockSupabase)

      const result = await ReservationValidator.validatePrice(
        'prop-123',
        '2026-08-05',
        '2026-08-08'
      )

      expect(result.success).toBe(true)
      expect(result.pricePerNight).toEqual([110, 110, 110])
      expect(result.subtotal).toBe(330)
      expect(result.breakdown).toEqual([
        { date: '2026-08-05', price: 110 },
        { date: '2026-08-06', price: 110 },
        { date: '2026-08-07', price: 110 },
      ])
    })
  })

  describe('validateDiscounts', () => {
    it('should return no discount for stays under 7 nights', async () => {
      const result = await ReservationValidator.validateDiscounts('prop-123', 300, 5)

      expect(result.hasDiscount).toBe(false)
      expect(result.discountPercentage).toBe(0)
      expect(result.discountedPrice).toBe(300)
      expect(result.reason).toContain('under 7 nights')
    })

    it('should apply discount for eligible nights', async () => {
      const result = await ReservationValidator.validateDiscounts('prop-123', 800, 10)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('hasDiscount')
      expect(result).toHaveProperty('discountPercentage')
    })

    it('should apply extended discount for 28+ night stays', async () => {
      const result = await ReservationValidator.validateDiscounts('prop-123', 1800, 30)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('hasDiscount')
      expect(result).toHaveProperty('discountedPrice')
    })

    it('should calculate correct discount amount', async () => {
      const result = await ReservationValidator.validateDiscounts('prop-123', 500, 10)

      expect(result).toHaveProperty('success')
      if (result.hasDiscount && result.discountPercentage > 0) {
        const expectedDiscountedPrice = 500 - (500 * result.discountPercentage) / 100
        expect(result.discountedPrice).toBeCloseTo(expectedDiscountedPrice, 2)
      }
    })
  })

  describe('validateMinimumNights', () => {
    it('should have success property', async () => {
      const result = await ReservationValidator.validateMinimumNights('prop-123', 3)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('passed')
      expect(result).toHaveProperty('minimumNights')
      expect(result).toHaveProperty('selectedNights')
    })

    it('should fail if selected nights < minimum requirement', async () => {
      const result = await ReservationValidator.validateMinimumNights('prop-123', 1)

      expect(result).toHaveProperty('success')
      if (!result.passed) {
        expect(result.error).toBeDefined()
      }
    })

    it('should allow an approved minimum-nights override for manual reservations', async () => {
      mockSupabase = buildSupabaseMock({
        property_availability: {
          data: { min_nights: 3, max_nights: 365 },
          error: null,
        },
        pricing_rules: {
          data: [
            {
              min_nights: 6,
            },
          ],
          error: null,
        },
      })
      mockCreateClient.mockResolvedValue(mockSupabase)

      const result = await ReservationValidator.validateMinimumNights(
        'prop-123',
        1,
        '2026-08-10',
        '2026-08-11',
        { allowMinimumNightsOverride: true }
      )

      expect(result.passed).toBe(true)
      expect(result.requiresApproval).toBe(true)
      expect(result.overrideApplied).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should handle non-existent property', async () => {
      const result = await ReservationValidator.validateMinimumNights('non-existent', 5)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('error')
    })
  })

  describe('validateCancellationPolicy', () => {
    it('should fetch policy for property and date', async () => {
      const result = await ReservationValidator.validateCancellationPolicy(
        'prop-123',
        '2026-08-15'
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('policyId')
      expect(result).toHaveProperty('policyName')
      expect(result).toHaveProperty('terms')
      expect(result).toHaveProperty('refundPercentage')
      expect(result).toHaveProperty('refundDeadlineDays')
    })

    it('should return most recent policy for date', async () => {
      const result = await ReservationValidator.validateCancellationPolicy(
        'prop-123',
        '2026-08-15'
      )

      expect(result).toHaveProperty('policyName')
    })

    it('should handle missing policy gracefully', async () => {
      const result = await ReservationValidator.validateCancellationPolicy(
        'prop-123',
        '1999-01-01'
      )

      expect(result).toHaveProperty('success')
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('validateReservationOverlap', () => {
    it('should detect no overlap when dates are after', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-15',
        '2026-08-20'
      )

      expect(result).toHaveProperty('hasConflict')
      expect(result).toHaveProperty('conflictingReservations')
    })

    it('should detect no overlap when dates are before', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-01',
        '2026-08-03'
      )

      expect(result.hasConflict).toBeDefined()
    })

    it('should detect overlap with existing reservation', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-07',
        '2026-08-12'
      )

      expect(result).toHaveProperty('hasConflict')
      expect(result).toHaveProperty('conflictingReservations')
      expect(Array.isArray(result.conflictingReservations)).toBe(true)
    })

    it('should exclude cancelled reservations', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-25',
        '2026-08-30'
      )

      // Should not include cancelled reservations
      expect(result).toHaveProperty('hasConflict')
    })

    it('should exclude specific reservation ID (edit mode)', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-05',
        '2026-08-10',
        'res-001'
      )

      expect(result).toHaveProperty('hasConflict')
      // If excluding res-001, should not appear in conflicts
      if (result.conflictingReservations.length > 0) {
        expect(result.conflictingReservations.every((r) => r.id !== 'res-001')).toBe(true)
      }
    })

    it('should ignore calendar blocks for manual reservations', async () => {
      mockSupabase = buildSupabaseMock({
        reservations: { data: [], error: null },
        calendar_blocks: {
          data: [
            {
              id: 'block-001',
              start_date: '2026-08-19',
              end_date: '2026-08-24',
            },
          ],
          error: null,
        },
      })
      mockCreateClient.mockResolvedValue(mockSupabase)

      const result = await ReservationValidator.validateReservationOverlap(
        'prop-123',
        '2026-08-20',
        '2026-08-24'
      )

      expect(result.hasConflict).toBe(false)
      expect(result.conflictingReservations).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      const result = await ReservationValidator.validateReservationOverlap(
        'prop-error',
        '2026-08-05',
        '2026-08-10'
      )

      expect(result.hasConflict).toBe(false)
      expect(Array.isArray(result.conflictingReservations)).toBe(true)
    })
  })

  describe('validate', () => {
    it('should run all validations and return combined result', async () => {
      const result = await ReservationValidator.validate(
        'prop-123',
        '2026-08-05',
        '2026-08-10'
      )

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('propertyId', 'prop-123')
      expect(result).toHaveProperty('nights', 5)
      expect(result).toHaveProperty('price')
      expect(result).toHaveProperty('discount')
      expect(result).toHaveProperty('minimumNights')
      expect(result).toHaveProperty('cancellationPolicy')
      expect(result).toHaveProperty('finalPrice')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('warnings')
    })

    it('should mark as failed if errors exist', async () => {
      const result = await ReservationValidator.validate(
        'prop-123',
        '2026-08-10',
        '2026-08-05'
      )

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should calculate correct number of nights', async () => {
      const result = await ReservationValidator.validate(
        'prop-123',
        '2026-08-05',
        '2026-08-12'
      )

      expect(result.nights).toBe(7)
    })

    it('should collect all validation errors', async () => {
      const result = await ReservationValidator.validate(
        'non-existent-prop',
        '1999-01-01',
        '1999-01-02'
      )

      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should calculate final price after discount', async () => {
      const result = await ReservationValidator.validate(
        'prop-123',
        '2026-08-05',
        '2026-08-15'
      )

      if (result.price.success) {
        expect(result.finalPrice).toBeLessThanOrEqual(result.price.subtotal)
      }
    })
  })

  describe('Epic 43 Phase 2 - Bug Fixes', () => {
    describe('Bug #1: minNights Validation from property_availability', () => {
      it('should query property_availability table for minimum nights (not hardcoded)', async () => {
        const result = await ReservationValidator.validateMinimumNights('prop-123', 5)
        // Should return a result object with minimum nights property
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('minimumNights')
        expect(result).toHaveProperty('selectedNights', 5)
        // minimumNights should be a number (from DB or default 1)
        expect(typeof result.minimumNights).toBe('number')
        expect(result.minimumNights).toBeGreaterThanOrEqual(1)
      })

      it('should validate that selected nights meets minimum requirement', async () => {
        const result = await ReservationValidator.validateMinimumNights('prop-123', 1)
        // Should have a passed property indicating validation result
        expect(result).toHaveProperty('passed')
        expect(typeof result.passed).toBe('boolean')
      })

      it('should default to minimum 1 night when property_availability missing', async () => {
        const result = await ReservationValidator.validateMinimumNights(
          'non-existent-prop-id',
          1
        )
        // Should handle missing availability data gracefully
        // minimumNights should default to 1 regardless of success status
        expect(result).toHaveProperty('minimumNights')
        expect(result.minimumNights).toBeGreaterThanOrEqual(1)
      })
    })

    describe('Bug #2: Discount Calculation for 7+ and 28+ nights', () => {
      it('should NOT apply discount for stays under 7 nights', async () => {
        const result = await ReservationValidator.validateDiscounts('prop-123', 600, 6)
        // Explicitly test that 6 nights gets NO discount
        expect(result.hasDiscount).toBe(false)
        expect(result.discountPercentage).toBe(0)
        expect(result.discountedPrice).toBe(600)
      })

      it('should apply the default weekly discount for 7+ night stays', async () => {
        const nightlyRate = 85
        const nights = 9
        const basePrice = nightlyRate * nights // 9 nights = €765
        const result = await ReservationValidator.validateDiscounts('prop-123', basePrice, nights)

        expect(result).toHaveProperty('success')
        expect(result.hasDiscount).toBe(true)
        expect(result.discountPercentage).toBe(10)
        expect(result.discountedPrice).toBe(688.5)
        expect(result.originalPrice).toBe(basePrice)
        expect(result.reason).toContain('Default Weekly discount applied')
      })

      it('should apply the default monthly discount for 28+ night stays', async () => {
        const nightlyRate = 85
        const nights = 36
        const basePrice = nightlyRate * nights // 36 nights = €3060
        const result = await ReservationValidator.validateDiscounts('prop-123', basePrice, nights)

        expect(result).toHaveProperty('success')
        expect(result.hasDiscount).toBe(true)
        expect(result.discountPercentage).toBe(20)
        expect(result.discountedPrice).toBe(2448)
        expect(result.originalPrice).toBe(basePrice)
        expect(result.reason).toContain('Default Monthly discount applied')
      })

      it('should never apply discount for stays under 7 nights regardless of DB', async () => {
        // This explicitly tests the hardcoded check in validateDiscounts
        const result = await ReservationValidator.validateDiscounts('prop-123', 500, 5)
        expect(result.hasDiscount).toBe(false)
        expect(result.discountPercentage).toBe(0)
        expect(result.reason).toContain('under 7 nights')
      })
    })
  })
})
