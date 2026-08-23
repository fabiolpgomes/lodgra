import {
  calculateLoyaltyDiscount,
  applyLoyaltyDiscount,
  formatLoyaltyMessage,
} from '@/lib/loyalty/loyalty-calculator'

describe('Loyalty Calculator', () => {
  describe('calculateLoyaltyDiscount', () => {
    it('should deny loyalty discount when disabled', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.9,
        reservation_count: 2,
        has_previous_reservations: true,
        loyalty_discount_enabled: false,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(false)
      expect(result.discount_percentage).toBe(0)
    })

    it('should deny loyalty discount for first-time guests', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.9,
        reservation_count: 0,
        has_previous_reservations: false,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(false)
      expect(result.discount_percentage).toBe(0)
    })

    it('should deny loyalty discount when rating below 4.8', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.7,
        reservation_count: 5,
        has_previous_reservations: true,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(false)
      expect(result.discount_percentage).toBe(0)
    })

    it('should deny loyalty discount when insufficient reviews (<3)', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.9,
        reservation_count: 2,
        has_previous_reservations: true,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(false)
      expect(result.discount_percentage).toBe(0)
    })

    it('should grant loyalty discount for guest with 4.8+ rating and 3+ reviews', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.9,
        reservation_count: 3,
        has_previous_reservations: true,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(true)
      expect(result.discount_percentage).toBe(10)
    })

    it('should grant loyalty discount for unreviewed guest with previous stays', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: null,
        reservation_count: 1,
        has_previous_reservations: true,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(true)
      expect(result.discount_percentage).toBe(10)
    })

    it('should grant loyalty discount for guest with exactly 4.8 rating', () => {
      const result = calculateLoyaltyDiscount({
        average_rating: 4.8,
        reservation_count: 3,
        has_previous_reservations: true,
        loyalty_discount_enabled: true,
        loyalty_discount_percentage: 10,
      })

      expect(result.is_eligible).toBe(true)
      expect(result.discount_percentage).toBe(10)
    })
  })

  describe('applyLoyaltyDiscount', () => {
    it('should apply 10% loyalty discount correctly', () => {
      // €665 (after 5% weekly discount from €700) with 10% loyalty = €598.50
      const result = applyLoyaltyDiscount(66500, 10) // Cents
      expect(result.final_price).toBe(59850)
      expect(result.loyalty_amount).toBe(6650)
    })

    it('should return zero discount when percentage is zero', () => {
      const result = applyLoyaltyDiscount(66500, 0)
      expect(result.final_price).toBe(66500)
      expect(result.loyalty_amount).toBe(0)
    })

    it('should apply 5% loyalty discount', () => {
      const result = applyLoyaltyDiscount(100000, 5) // €1000 with 5% = €950
      expect(result.final_price).toBe(95000)
      expect(result.loyalty_amount).toBe(5000)
    })

    it('should handle rounding correctly', () => {
      // €665.33 with 10% loyalty should round properly
      const result = applyLoyaltyDiscount(66533, 10)
      const totalBack = result.final_price + result.loyalty_amount
      // Allow ±1 cent rounding error
      expect(Math.abs(totalBack - 66533)).toBeLessThanOrEqual(1)
    })
  })

  describe('formatLoyaltyMessage', () => {
    it('should return empty string when not eligible', () => {
      const message = formatLoyaltyMessage(false, 10, 6650)
      expect(message).toBe('')
    })

    it('should format message with amount', () => {
      const message = formatLoyaltyMessage(true, 10, 6650)
      expect(message).toContain('🎁')
      expect(message).toContain('Desconto Fidelidade')
      expect(message).toMatch(/66,50/)
      expect(message).toContain('€')
      expect(message).toContain('10%')
    })

    it('should format message without amount', () => {
      const message = formatLoyaltyMessage(true, 10)
      expect(message).toContain('🎁')
      expect(message).toContain('10%')
      expect(message).not.toContain('€')
    })
  })

  describe('Integration: Full Pricing with Loyalty', () => {
    it('should calculate correct final price with duration + loyalty discounts', () => {
      // Scenario: €100/night × 7 nights = €700
      // - Semanal -5% = €665
      // - Fidelidade -10% (additional) = €598.50

      const baseNightly = 10000 // €100 in cents
      const nights = 7
      const baseTotal = baseNightly * nights // 70000 cents = €700

      // Apply weekly discount (5%)
      const weeklyDiscount = 5
      const afterWeekly = Math.round(baseTotal * (1 - weeklyDiscount / 100))
      expect(afterWeekly).toBe(66500) // €665

      // Apply loyalty discount (10%)
      const loyaltyResult = applyLoyaltyDiscount(afterWeekly, 10)
      expect(loyaltyResult.final_price).toBe(59850) // €598.50
      expect(loyaltyResult.loyalty_amount).toBe(6650) // €66.50
    })
  })
})
