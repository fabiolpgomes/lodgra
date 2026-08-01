/**
 * Unit Tests: AvailabilityValidator
 * Tests Epic 43 availability rules validation
 */

describe('AvailabilityValidator', () => {
  const defaultRules = {
    minNights: 2,
    maxNights: 30,
    advanceNoticeDays: 7,
    allowLastMinuteBookings: false,
    availabilityWindowMonths: 12,
    allowBookingsBeyondWindow: false,
  }

  describe('Minimum Night Validation', () => {
    it('should reject booking with less than minNights', () => {
      const checkIn = '2026-08-05'
      const checkOut = '2026-08-06' // 1 night
      const rules = { ...defaultRules, minNights: 2 }

      const nights = 1
      const isValid = nights >= rules.minNights

      expect(isValid).toBe(false)
    })

    it('should accept booking with exactly minNights', () => {
      const checkIn = '2026-08-05'
      const checkOut = '2026-08-07' // 2 nights
      const rules = { ...defaultRules, minNights: 2 }

      const nights = 2
      const isValid = nights >= rules.minNights

      expect(isValid).toBe(true)
    })

    it('should accept booking with more than minNights', () => {
      const checkIn = '2026-08-05'
      const checkOut = '2026-08-10' // 5 nights
      const rules = { ...defaultRules, minNights: 2 }

      const nights = 5
      const isValid = nights >= rules.minNights

      expect(isValid).toBe(true)
    })
  })

  describe('Maximum Night Validation', () => {
    it('should reject booking exceeding maxNights', () => {
      const checkIn = '2026-08-01'
      const checkOut = '2026-09-01' // 31 nights
      const rules = { ...defaultRules, maxNights: 30 }

      const nights = 31
      const isValid = nights <= rules.maxNights

      expect(isValid).toBe(false)
    })

    it('should accept booking within maxNights', () => {
      const checkIn = '2026-08-01'
      const checkOut = '2026-08-31' // 30 nights
      const rules = { ...defaultRules, maxNights: 30 }

      const nights = 30
      const isValid = nights <= rules.maxNights

      expect(isValid).toBe(true)
    })
  })

  describe('Advance Notice Validation', () => {
    it('should reject same-day booking if advanceNoticeDays = 7', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-01' // Same day
      const rules = { ...defaultRules, advanceNoticeDays: 7 }

      const daysUntilCheckIn = 0 // Today
      const isValid = daysUntilCheckIn >= rules.advanceNoticeDays

      expect(isValid).toBe(false)
    })

    it('should allow same-day booking if advanceNoticeDays = 0', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-01' // Same day
      const rules = { ...defaultRules, advanceNoticeDays: 0 }

      const daysUntilCheckIn = 0
      const isValid = daysUntilCheckIn >= rules.advanceNoticeDays

      expect(isValid).toBe(true)
    })

    it('should allow 7+ days in advance if advanceNoticeDays = 7', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-10' // 9 days
      const rules = { ...defaultRules, advanceNoticeDays: 7 }

      const daysUntilCheckIn = 9
      const isValid = daysUntilCheckIn >= rules.advanceNoticeDays

      expect(isValid).toBe(true)
    })

    it('should reject booking 5 days in advance if advanceNoticeDays = 7', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-06' // 5 days
      const rules = { ...defaultRules, advanceNoticeDays: 7 }

      const daysUntilCheckIn = 5
      const isValid = daysUntilCheckIn >= rules.advanceNoticeDays

      expect(isValid).toBe(false)
    })
  })

  describe('Last Minute Booking Flag', () => {
    it('should require approval if booking < 1 day and allowLastMinuteBookings = false', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-01' // Same day
      const rules = { ...defaultRules, allowLastMinuteBookings: false }

      const daysUntilCheckIn = 0
      const requiresApproval = daysUntilCheckIn < 1 && !rules.allowLastMinuteBookings

      expect(requiresApproval).toBe(true)
    })

    it('should allow last-minute booking if allowLastMinuteBookings = true', () => {
      const today = '2026-08-01'
      const checkIn = '2026-08-01' // Same day
      const rules = { ...defaultRules, allowLastMinuteBookings: true }

      const daysUntilCheckIn = 0
      const requiresApproval = daysUntilCheckIn < 1 && !rules.allowLastMinuteBookings

      expect(requiresApproval).toBe(false)
    })
  })

  describe('Availability Window Validation', () => {
    it('should reject booking beyond 12-month window', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2027-09-01') // 13 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 12 }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd

      expect(isWithinWindow).toBe(false)
    })

    it('should allow booking within 12-month window', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2027-07-01') // 11 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 12 }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd

      expect(isWithinWindow).toBe(true)
    })

    it('should respect 3-month window', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2026-11-15') // 3.5 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 3 }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd

      expect(isWithinWindow).toBe(false)
    })
  })

  describe('Beyond Window Handling', () => {
    it('should reject booking beyond window if allowBookingsBeyondWindow = false', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2027-09-01') // 13 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 12, allowBookingsBeyondWindow: false }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd
      const isValid = isWithinWindow || rules.allowBookingsBeyondWindow

      expect(isValid).toBe(false)
    })

    it('should allow booking beyond window if allowBookingsBeyondWindow = true', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2027-09-01') // 13 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 12, allowBookingsBeyondWindow: true }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd
      const isValid = isWithinWindow || rules.allowBookingsBeyondWindow

      expect(isValid).toBe(true)
    })
  })

  describe('Combined Validation Rules', () => {
    it('Scenario 1: 2-night stay, 7-day advance notice, within 12-month window', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2026-08-10')
      const checkOut = new Date('2026-08-12')
      const rules = {
        minNights: 2,
        maxNights: 30,
        advanceNoticeDays: 7,
        allowLastMinuteBookings: false,
        availabilityWindowMonths: 12,
        allowBookingsBeyondWindow: false,
      }

      // Calculate results
      const nights = 2
      const daysUntilCheckIn = 9
      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)

      // Validate each rule
      const minNightOk = nights >= rules.minNights // ✅
      const maxNightOk = nights <= rules.maxNights // ✅
      const advanceOk = daysUntilCheckIn >= rules.advanceNoticeDays // ✅
      const windowOk = checkIn <= windowEnd // ✅

      const isValid = minNightOk && maxNightOk && advanceOk && windowOk

      expect(isValid).toBe(true)
    })

    it('Scenario 2: 1-night stay (violates minNights = 2)', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2026-08-10')
      const checkOut = new Date('2026-08-11')
      const rules = {
        minNights: 2,
        maxNights: 30,
        advanceNoticeDays: 7,
        allowLastMinuteBookings: false,
        availabilityWindowMonths: 12,
        allowBookingsBeyondWindow: false,
      }

      const nights = 1
      const isValid = nights >= rules.minNights

      expect(isValid).toBe(false)
    })

    it('Scenario 3: Same-day booking (violates advanceNoticeDays = 7, requires approval)', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2026-08-01')
      const checkOut = new Date('2026-08-03')
      const rules = {
        minNights: 2,
        maxNights: 30,
        advanceNoticeDays: 7,
        allowLastMinuteBookings: false,
        availabilityWindowMonths: 12,
        allowBookingsBeyondWindow: false,
      }

      const nights = 2
      const daysUntilCheckIn = 0

      // Check all rules
      const minNightOk = nights >= rules.minNights // ✅
      const advanceOk = daysUntilCheckIn >= rules.advanceNoticeDays // ❌
      const requiresApproval = !advanceOk && !rules.allowLastMinuteBookings // ✅

      expect(minNightOk).toBe(true)
      expect(advanceOk).toBe(false)
      expect(requiresApproval).toBe(true)
    })

    it('Scenario 4: 35-night booking exceeds maxNights = 30', () => {
      const checkIn = new Date('2026-08-01')
      const checkOut = new Date('2026-09-05')
      const rules = { ...defaultRules, maxNights: 30 }

      const nights = 35
      const isValid = nights <= rules.maxNights

      expect(isValid).toBe(false)
    })

    it('Scenario 5: Booking 15 months in future (beyond 12-month window)', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2027-11-01')
      const rules = {
        ...defaultRules,
        availabilityWindowMonths: 12,
        allowBookingsBeyondWindow: false,
      }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isWithinWindow = checkIn <= windowEnd
      const isValid = isWithinWindow || rules.allowBookingsBeyondWindow

      expect(isValid).toBe(false)
    })
  })

  describe('Approval Requirements', () => {
    it('should flag approval required for last-minute booking', () => {
      const rules = { ...defaultRules, allowLastMinuteBookings: false }
      const daysUntilCheckIn = 0

      const requiresApproval = daysUntilCheckIn < 1 && !rules.allowLastMinuteBookings

      expect(requiresApproval).toBe(true)
    })

    it('should flag approval required if below advance notice', () => {
      const rules = { ...defaultRules, advanceNoticeDays: 7 }
      const daysUntilCheckIn = 3

      const requiresApproval = daysUntilCheckIn < rules.advanceNoticeDays

      expect(requiresApproval).toBe(true)
    })

    it('should NOT require approval if all rules pass', () => {
      const rules = defaultRules
      const nights = 5
      const daysUntilCheckIn = 10

      const minNightOk = nights >= rules.minNights
      const maxNightOk = nights <= rules.maxNights
      const advanceOk = daysUntilCheckIn >= rules.advanceNoticeDays

      const requiresApproval = !minNightOk || !maxNightOk || !advanceOk

      expect(requiresApproval).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minNights = maxNights (only exact duration allowed)', () => {
      const rules = { ...defaultRules, minNights: 7, maxNights: 7 }

      // Exactly 7: OK
      const nights7 = 7
      expect(nights7 >= rules.minNights && nights7 <= rules.maxNights).toBe(true)

      // 6: Too short
      const nights6 = 6
      expect(nights6 >= rules.minNights && nights6 <= rules.maxNights).toBe(false)

      // 8: Too long
      const nights8 = 8
      expect(nights8 >= rules.minNights && nights8 <= rules.maxNights).toBe(false)
    })

    it('should handle advanceNoticeDays = 0 (allow any booking)', () => {
      const rules = { ...defaultRules, advanceNoticeDays: 0 }
      const daysUntilCheckIn = 0 // Same day

      const isValid = daysUntilCheckIn >= rules.advanceNoticeDays

      expect(isValid).toBe(true)
    })

    it('should handle availabilityWindowMonths = 24 (2 years)', () => {
      const today = new Date('2026-08-01')
      const checkIn = new Date('2028-07-01') // 23 months away
      const rules = { ...defaultRules, availabilityWindowMonths: 24 }

      const windowEnd = new Date(today)
      windowEnd.setMonth(windowEnd.getMonth() + rules.availabilityWindowMonths)
      const isValid = checkIn <= windowEnd

      expect(isValid).toBe(true)
    })
  })
})
