/**
 * Story 37.2: Discount Calculator Tests
 */

import {
  calculateDiscount,
  isValidDiscount,
  DiscountConfig,
} from '@/lib/pricing/discount-calculator'

describe('Discount Calculator', () => {
  const config: DiscountConfig = {
    weeklyPercent: 5,
    monthlyPercent: 15,
    loyaltyPercent: 10,
  }

  describe('Weekly Discounts (7-27 nights)', () => {
    it('should apply weekly discount for 7+ nights', () => {
      const basePrice = 700 // €100/night × 7
      const result = calculateDiscount(7, basePrice, config)

      expect(result.weeklyDiscount).toBe(35) // 5% of 700
      expect(result.monthlyDiscount).toBe(0)
      expect(result.finalPrice).toBe(665)
      expect(result.appliedDiscount).toContain('Semanal')
    })

    it('should not apply discount for <7 nights', () => {
      const basePrice = 600 // €100/night × 6
      const result = calculateDiscount(6, basePrice, config)

      expect(result.weeklyDiscount).toBe(0)
      expect(result.finalPrice).toBe(600)
      expect(result.appliedDiscount).toBe('Nenhum')
    })

    it('should apply larger discount percentage for longer stays', () => {
      const basePrice = 1400 // €100/night × 14
      const result = calculateDiscount(14, basePrice, config)

      expect(result.weeklyDiscount).toBe(70) // 5% of 1400
      expect(result.finalPrice).toBe(1330)
    })
  })

  describe('Monthly Discounts (28+ nights)', () => {
    it('should apply monthly discount for 28+ nights', () => {
      const basePrice = 2800 // €100/night × 28
      const result = calculateDiscount(28, basePrice, config)

      expect(result.monthlyDiscount).toBe(420) // 15% of 2800
      expect(result.weeklyDiscount).toBe(0)
      expect(result.finalPrice).toBe(2380)
      expect(result.appliedDiscount).toContain('Mensal')
    })

    it('should apply monthly instead of weekly when cascading', () => {
      const basePrice = 3000 // €100/night × 30
      const result = calculateDiscount(30, basePrice, config)

      // Should use monthly (15%) not weekly (5%)
      expect(result.monthlyDiscount).toBe(450) // 15% of 3000
      expect(result.weeklyDiscount).toBe(0)
      expect(result.finalPrice).toBe(2550)
    })

    it('should handle long-term stays', () => {
      const basePrice = 7000 // €100/night × 70
      const result = calculateDiscount(70, basePrice, config)

      expect(result.monthlyDiscount).toBe(1050) // 15% of 7000
      expect(result.finalPrice).toBe(5950)
    })
  })

  describe('Loyalty Discount (Additional)', () => {
    it('should add loyalty discount for repeat customers', () => {
      const basePrice = 700 // 7 nights
      const result = calculateDiscount(7, basePrice, config, true)

      // Weekly discount: 5% of 700 = 35 → 665
      // Loyalty discount: 10% of 665 = 66.50
      // Final: 665 - 66.50 = 598.50
      expect(result.weeklyDiscount).toBe(35)
      expect(result.loyaltyDiscount).toBe(66.5)
      expect(result.finalPrice).toBe(598.5)
      expect(result.appliedDiscount).toContain('Fidelidade')
    })

    it('should not apply loyalty discount for non-repeat customers', () => {
      const basePrice = 700
      const result = calculateDiscount(7, basePrice, config, false)

      expect(result.loyaltyDiscount).toBe(0)
      expect(result.finalPrice).toBe(665)
    })

    it('should apply loyalty on top of monthly discount', () => {
      const basePrice = 2800 // 28 nights
      const result = calculateDiscount(28, basePrice, config, true)

      // Monthly: 15% of 2800 = 420 → 2380
      // Loyalty: 10% of 2380 = 238
      // Final: 2380 - 238 = 2142
      expect(result.monthlyDiscount).toBe(420)
      expect(result.loyaltyDiscount).toBe(238)
      expect(result.finalPrice).toBe(2142)
    })
  })

  describe('Edge Cases', () => {
    it('should handle 0% discount', () => {
      const configZero = { weeklyPercent: 0, monthlyPercent: 0 }
      const basePrice = 700
      const result = calculateDiscount(7, basePrice, configZero)

      expect(result.weeklyDiscount).toBe(0)
      expect(result.finalPrice).toBe(700)
    })

    it('should round to 2 decimal places', () => {
      const config33 = { weeklyPercent: 33.33, monthlyPercent: 50 }
      const basePrice = 333.33
      const result = calculateDiscount(7, basePrice, config33)

      // 33.33% of 333.33 = 111.0989... → 111.10
      expect(result.finalPrice).toBe(222.23)
    })

    it('should handle exact boundary (27 vs 28 nights)', () => {
      const basePrice = 2800

      const result27 = calculateDiscount(27, basePrice, config)
      const result28 = calculateDiscount(28, basePrice, config)

      // 27 nights: weekly discount (5%)
      // 28 nights: monthly discount (15%)
      expect(result27.finalPrice).toBe(2660) // 5% discount
      expect(result28.finalPrice).toBe(2380) // 15% discount
    })
  })

  describe('Validation', () => {
    it('should validate discount percentages', () => {
      expect(isValidDiscount(0)).toBe(true)
      expect(isValidDiscount(50)).toBe(true)
      expect(isValidDiscount(100)).toBe(true)
      expect(isValidDiscount(-1)).toBe(false)
      expect(isValidDiscount(101)).toBe(false)
      expect(isValidDiscount(NaN)).toBe(false)
    })
  })

  describe('Real-World Examples', () => {
    it('example: 7-night stay with 5% weekly discount', () => {
      // User: 7 nights, €100/night = €700
      // Weekly discount: 5%
      // Expected: €665
      const result = calculateDiscount(7, 700, config)
      expect(result.finalPrice).toBe(665)
    })

    it('example: 28-night stay with 15% monthly + 10% loyalty', () => {
      // User: 28 nights, €100/night = €2800
      // Monthly discount: 15% = €420 saved → €2380
      // Loyalty: 10% of €2380 = €238 saved
      // Expected: €2142
      const result = calculateDiscount(28, 2800, config, true)
      expect(result.finalPrice).toBe(2142)
    })

    it('example: 5-night stay with no discount', () => {
      // User: 5 nights, €100/night = €500
      // No discount (< 7 nights)
      // Expected: €500
      const result = calculateDiscount(5, 500, config)
      expect(result.finalPrice).toBe(500)
    })
  })
})
