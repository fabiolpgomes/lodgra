import { DiscountCalculator } from '@/lib/pricing/discount-calculator'

describe('DiscountCalculator', () => {
  describe('Individual Discount Types', () => {
    it('should apply loyalty discount only', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 10,
        stay_duration_nights: 5,
        days_until_checkin: 10,
      })

      expect(result.loyalty_discount_amount).toBe(10)
      expect(result.final_price).toBe(90)
    })

    it('should apply last-minute discount (7 days)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 7,
      })

      expect(result.last_minute_discount.applied).toBe(true)
      expect(result.final_price).toBe(90)
    })

    it('should NOT apply last-minute discount (8+ days)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 8,
      })

      expect(result.last_minute_discount.applied).toBe(false)
      expect(result.final_price).toBe(100)
    })

    it('should apply extended stay discount (7+ nights)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 7,
        days_until_checkin: 10,
      })

      expect(result.extended_stay_discount.applied).toBe(true)
      expect(result.final_price).toBe(95)
    })

    it('should NOT apply extended stay discount (6 nights)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 6,
        days_until_checkin: 10,
      })

      expect(result.extended_stay_discount.applied).toBe(false)
      expect(result.final_price).toBe(100)
    })

    it('should apply early-bird discount (30+ days)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 30,
      })

      expect(result.early_bird_discount.applied).toBe(true)
      expect(result.final_price).toBe(95)
    })

    it('should NOT apply early-bird discount (29 days)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 29,
      })

      expect(result.early_bird_discount.applied).toBe(false)
      expect(result.final_price).toBe(100)
    })
  })

  describe('Combined Discounts', () => {
    it('should combine loyalty + last-minute', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 10,
        stay_duration_nights: 3,
        days_until_checkin: 5,
      })

      // 100 - 10 (loyalty) = 90
      // 90 - 9 (10% last-minute) = 81
      expect(result.final_price).toBe(81)
    })

    it('should combine loyalty + extended stay + early-bird', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 10,
        stay_duration_nights: 10,
        days_until_checkin: 45,
      })

      // 100 - 10 (loyalty) = 90
      // 90 - 4.5 (5% early-bird) = 85.5
      // 85.5 - 4.275 (5% extended stay) ≈ 81.23
      expect(result.final_price).toBeCloseTo(81.23, 1)
    })
  })

  describe('Seasonal Modifiers', () => {
    it('should apply positive seasonal modifier with early-bird', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 45,
        seasonal_modifier_percent: 20,
      })

      // Early-bird: 100 - 5 = 95
      // Seasonal: 95 + 19 = 114
      expect(result.seasonal_adjustment.applied).toBe(true)
      expect(result.final_price).toBeCloseTo(114, 0)
    })

    it('should apply negative seasonal modifier with early-bird', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 45,
        seasonal_modifier_percent: -15,
      })

      // Early-bird: 100 - 5 = 95
      // Seasonal: 95 - 14.25 = 80.75
      expect(result.seasonal_adjustment.applied).toBe(true)
      expect(result.final_price).toBeCloseTo(80.75, 1)
    })

    it('should apply seasonal modifier only (no other discounts)', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 0,
        stay_duration_nights: 5,
        days_until_checkin: 5,
        seasonal_modifier_percent: 20,
      })

      // Last-minute: 100 - 10 = 90
      // Seasonal: 90 + 18 = 108
      expect(result.final_price).toBe(108)
    })
  })

  describe('Price Floor Protection', () => {
    it('should enforce 50% price floor', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 15,
        stay_duration_nights: 5,
        days_until_checkin: 45,
        seasonal_modifier_percent: -50,
      })

      expect(result.final_price).toBeGreaterThanOrEqual(50)
    })

    it('should respect custom price floor', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 10,
        stay_duration_nights: 5,
        days_until_checkin: 45,
        minimum_price_floor: 75,
      })

      expect(result.minimum_price_floor).toBe(75)
      expect(result.final_price).toBeGreaterThanOrEqual(75)
    })
  })

  describe('Input Validation', () => {
    it('should throw error for invalid base_price', () => {
      expect(() => {
        DiscountCalculator.calculate({
          base_price: -100,
          loyalty_discount_percent: 0,
          stay_duration_nights: 5,
          days_until_checkin: 10,
        })
      }).toThrow()
    })

    it('should throw error for invalid loyalty discount', () => {
      expect(() => {
        DiscountCalculator.calculate({
          base_price: 100,
          loyalty_discount_percent: 20,
          stay_duration_nights: 5,
          days_until_checkin: 10,
        })
      }).toThrow()
    })

    it('should throw error for invalid nights', () => {
      expect(() => {
        DiscountCalculator.calculate({
          base_price: 100,
          loyalty_discount_percent: 10,
          stay_duration_nights: 0,
          days_until_checkin: 10,
        })
      }).toThrow()
    })

    it('should throw error for negative days_until_checkin', () => {
      expect(() => {
        DiscountCalculator.calculate({
          base_price: 100,
          loyalty_discount_percent: 10,
          stay_duration_nights: 5,
          days_until_checkin: -1,
        })
      }).toThrow()
    })
  })

  describe('Response Format', () => {
    it('should return all discount details', () => {
      const result = DiscountCalculator.calculate({
        base_price: 100,
        loyalty_discount_percent: 10,
        stay_duration_nights: 7,
        days_until_checkin: 5,
      })

      expect(result.loyalty_discount_amount).toBeDefined()
      expect(result.last_minute_discount).toBeDefined()
      expect(result.extended_stay_discount).toBeDefined()
      expect(result.early_bird_discount).toBeDefined()
      expect(result.seasonal_adjustment).toBeDefined()
      expect(result.total_discounts_amount).toBeDefined()
      expect(result.discount_breakdown).toContain('€')
      expect(result.applied_rules).toBeInstanceOf(Array)
    })
  })

  describe('validatePrice', () => {
    it('should validate correct prices', () => {
      expect(DiscountCalculator.validatePrice(100, 90)).toBe(true)
      expect(DiscountCalculator.validatePrice(100, 50)).toBe(true)
    })

    it('should reject negative prices', () => {
      expect(DiscountCalculator.validatePrice(-100, 50)).toBe(false)
      expect(DiscountCalculator.validatePrice(100, -50)).toBe(false)
    })

    it('should reject excessive seasonal increases', () => {
      expect(DiscountCalculator.validatePrice(100, 151)).toBe(false)
    })
  })
})
