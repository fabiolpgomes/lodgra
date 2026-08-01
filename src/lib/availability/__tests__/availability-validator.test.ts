import { AvailabilityValidator, AvailabilityRules } from '../availability-validator'

describe('AvailabilityValidator', () => {
  const defaultRules: AvailabilityRules = {
    minNights: 2,
    maxNights: 30,
    advanceNoticeDays: 1,
    allowLastMinuteBookings: false,
    availabilityWindowMonths: 12,
    allowBookingsBeyondWindow: false,
  }

  describe('Minimum nights validation', () => {
    it('should reject reservation with less than minNights', () => {
      // 10 days from now, 1 night (requires 2)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 1)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.includes('Mínimo de 2'))).toBe(true)
    })

    it('should accept reservation with minNights or more', () => {
      // 10 days from now, 5 nights
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 5)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Maximum nights validation', () => {
    it('should reject reservation exceeding maxNights', () => {
      // 10 days from now, 35 nights (exceeds maxNights=30)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 35)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(false)
      expect(result.violations.some((v) => v.includes('Máximo de 30'))).toBe(true)
    })

    it('should accept reservation within maxNights', () => {
      // 10 days from now, 20 nights
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 20)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Advance notice validation', () => {
    it('should pass with sufficient advance notice', () => {
      // 7 days from now with requirement of 3 days notice should pass
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 3)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const rulesStrict: AvailabilityRules = {
        ...defaultRules,
        advanceNoticeDays: 3,
      }

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        rulesStrict
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Availability window validation', () => {
    it('should reject booking beyond window when not allowed', () => {
      // 15 months from now (exceeds 12-month window)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 15)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 2)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(false)
      expect(result.requiresApproval).toBe(true)
    })

    it('should accept booking within window', () => {
      // 6 months from now (within 12-month window)
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 6)
      const checkIn = futureDate.toISOString().split('T')[0]

      const checkOutDate = new Date(futureDate)
      checkOutDate.setDate(checkOutDate.getDate() + 2)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const result = AvailabilityValidator.validate(
        checkIn,
        checkOut,
        defaultRules
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Last-minute bookings', () => {
    it('should allow same-day booking when enabled', () => {
      // Today, 2 nights
      const today = new Date().toISOString().split('T')[0]
      const checkOutDate = new Date()
      checkOutDate.setDate(checkOutDate.getDate() + 2)
      const checkOut = checkOutDate.toISOString().split('T')[0]

      const rulesAllowLastMinute: AvailabilityRules = {
        ...defaultRules,
        allowLastMinuteBookings: true,
        advanceNoticeDays: 0,
      }

      const result = AvailabilityValidator.validate(
        today,
        checkOut,
        rulesAllowLastMinute
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('Utility methods', () => {
    it('should return window options', () => {
      const options = AvailabilityValidator.getWindowOptions()
      expect(options).toHaveLength(5)
      expect(options[0].value).toBe(3)
      expect(options[4].value).toBe(24)
    })

    it('should return notice days options', () => {
      const options = AvailabilityValidator.getNoticeDaysOptions()
      expect(options).toHaveLength(4)
      expect(options.map((o) => o.value)).toEqual([0, 1, 2, 7])
    })
  })
})
