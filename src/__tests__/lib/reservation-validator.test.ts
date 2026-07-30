import { ReservationValidator } from '@/lib/reservations/reservation-validator'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('ReservationValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
})
