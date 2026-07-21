/**
 * Tests for PricingCalculator (Story 36.4)
 */

import { PricingCalculator } from '../pricing-calculator'

describe('PricingCalculator', () => {
  describe('calculateBookingPrice', () => {
    /**
     * Test 1: Simple base price calculation
     * 3 nights × 100€/night = 300€
     */
    it('should calculate base price for simple booking without multipliers', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-13', // Monday
        checkOutDate: '2026-07-16', // Thursday (3 nights)
        nightlyRate: 100,
        minNights: 1,
      })

      expect(result.total).toBe(300)
      expect(result.avgNightly).toBe(100.0)
      expect(result.breakdown.length).toBeGreaterThan(0)
      expect(result.breakdown[0].component).toBe('base')
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 2: Weekend multiplier application
     * 3 nights: Friday (5) + Saturday (6) + Sunday (0)
     * Friday: 100 × 1.2 = 120
     * Saturday: 100 × 1.2 = 120
     * Sunday: 100 = 100
     * Total: 340
     */
    it('should apply weekend multiplier correctly for Friday and Saturday', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10', // Friday
        checkOutDate: '2026-07-13', // Monday (3 nights: Fri, Sat, Sun)
        nightlyRate: 100,
        weekendMultiplier: 1.2,
        minNights: 1,
      })

      expect(result.total).toBe(340) // 120 + 120 + 100
      expect(result.avgNightly).toBe(113.33)
      // Should have weekend items in breakdown
      const weekendItems = result.breakdown.filter((item) => item.component === 'weekend')
      expect(weekendItems.length).toBe(2) // Friday and Saturday
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 3: 7-night discount
     * 7 nights × 100€ = 700€, minus 5% discount = 665€
     */
    it('should apply 7-night discount correctly', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01', // Wednesday
        checkOutDate: '2026-07-08', // Wednesday (7 nights)
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        minNights: 1,
      })

      expect(result.total).toBe(665) // 700 - 35
      expect(result.avgNightly).toBe(95.0)
      const discountItems = result.breakdown.filter((item) => item.component === 'discount_7night')
      expect(discountItems.length).toBe(1)
      expect(discountItems[0].value).toBe(-35)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 4: 28-night discount (higher than 7-night)
     * 28 nights × 100€ = 2800€, apply 10% (higher discount) = 2520€
     */
    it('should apply 28-night discount (larger than 7-night)', () => {
      const checkInDate = '2026-07-01'
      const checkOutDate = '2026-07-29' // 28 nights

      const result = PricingCalculator.calculateBookingPrice({
        checkInDate,
        checkOutDate,
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0.1,
        minNights: 1,
      })

      expect(result.total).toBe(2520) // 2800 - 280
      expect(result.avgNightly).toBe(90.0)
      // Should have 28-night discount, not 7-night
      const discounts28 = result.breakdown.filter((item) => item.component === 'discount_28night')
      const discounts7 = result.breakdown.filter((item) => item.component === 'discount_7night')
      expect(discounts28.length).toBe(1)
      expect(discounts7.length).toBe(0)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 5: Discounts do NOT stack
     * 28 nights should use only 10% discount, not 5% + 10% = 15%
     */
    it('should not stack discounts (apply larger only)', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-29', // 28 nights
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0.1,
        minNights: 1,
      })

      // If stacking (5% + 10% = 15%): 2800 - 420 = 2380
      // Correct (10% only): 2800 - 280 = 2520
      expect(result.total).toBe(2520) // NOT 2380
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 6: Daily override takes precedence over discount
     * 7 nights: first night override 150, other 6 nights × 100 = 750
     * Base: 150 + 600 = 750, minus 5% discount on 6 nights (not overridden) = 750 - 30 = 720
     */
    it('should use daily override price (does not participate in discount)', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-08', // 7 nights
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        dailyPrices: [{ date: '2026-07-01', basePrice: 100, override: 150 }],
        minNights: 1,
      })

      // Override night (150) + 6 base nights (600) - discount on 6 (30) = 720
      expect(result.total).toBe(720)
      expect(result.avgNightly).toBe(102.86)
      const overrideItems = result.breakdown.filter((item) => item.component === 'override')
      expect(overrideItems.length).toBe(1)
      expect(overrideItems[0].value).toBe(150)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 7: Minimum nights validation
     * 2 nights requested, but min_nights = 3 → error
     */
    it('should validate minimum night requirement', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-03', // 2 nights
        nightlyRate: 100,
        minNights: 3,
      })

      expect(result.total).toBe(0)
      expect(result.avgNightly).toBe(0)
      expect(result.breakdown.length).toBe(0)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('MIN_NIGHTS_NOT_MET')
      expect(result.error?.required).toBe(3)
    })

    /**
     * Test 8: Null/undefined values handled gracefully
     * weekend_multiplier = null → default to 1.0 (no multiplier)
     * sevenNightDiscount = undefined → no discount
     * dailyPrices = undefined → no overrides
     */
    it('should handle null and undefined values gracefully', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-13', // Monday
        checkOutDate: '2026-07-16', // Thursday (3 nights)
        nightlyRate: 100,
        weekendMultiplier: null,
        sevenNightDiscount: undefined,
        dailyPrices: undefined,
        minNights: undefined,
      })

      expect(result.total).toBe(300) // 3 × 100, no multiplier
      expect(result.avgNightly).toBe(100.0)
      expect(result.breakdown.filter((item) => item.component === 'base').length).toBe(3)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 9: Breakdown accuracy
     * All items in breakdown should sum to total
     */
    it('should generate accurate breakdown with all components summing to total', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10', // Friday
        checkOutDate: '2026-07-17', // Friday (7 nights)
        nightlyRate: 100,
        weekendMultiplier: 1.2,
        sevenNightDiscount: 0.05,
        minNights: 1,
      })

      // Friday: 120, Saturday: 120, Sun-Thu: 5 × 100 = 500
      // Total before discount: 740
      // Discount on 7 nights: 740 × 0.05 = 37
      // Final: 740 - 37 = 703

      expect(result.total).toBe(703)
      // Verify breakdown sums correctly
      let calculatedSum = 0
      result.breakdown.forEach((item) => {
        calculatedSum += item.value
      })
      expect(calculatedSum).toBe(result.total)
    })

    /**
     * Test 10: Average nightly rate calculated with 2 decimal precision
     */
    it('should calculate average nightly rate with 2 decimal precision', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-04', // 3 nights
        nightlyRate: 100,
        minNights: 1,
      })

      expect(result.avgNightly).toBe(100.0)

      // Non-even division
      const result2 = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10', // Friday
        checkOutDate: '2026-07-13', // Monday (3 nights: 120 + 120 + 100)
        nightlyRate: 100,
        weekendMultiplier: 1.2,
        minNights: 1,
      })

      expect(result2.total).toBe(340)
      expect(result2.avgNightly).toBe(113.33) // 340 / 3 = 113.333... → 113.33
      expect(result2.error).toBeUndefined()
    })

    /**
     * Test 11: Exact boundary cases (7 nights exactly)
     */
    it('should apply discount at exact 7-night boundary', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-08', // Exactly 7 nights
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        minNights: 1,
      })

      expect(result.breakdown.some((item) => item.component === 'discount_7night')).toBe(true)
    })

    /**
     * Test 12: Exact boundary cases (28 nights exactly)
     */
    it('should apply discount at exact 28-night boundary', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-29', // Exactly 28 nights
        nightlyRate: 100,
        twentyEightNightDiscount: 0.1,
        minNights: 1,
      })

      expect(result.breakdown.some((item) => item.component === 'discount_28night')).toBe(true)
    })

    /**
     * Test 13: Check-out before check-in validation
     */
    it('should return error if check-out is before check-in', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-08', // Before check-in
        nightlyRate: 100,
      })

      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('INVALID_DATES')
      expect(result.total).toBe(0)
    })

    /**
     * Test 14: Complex scenario with multiple components
     * Weekend multiplier + override + discount
     */
    it('should handle complex scenario: weekend + override + discount', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10', // Friday
        checkOutDate: '2026-07-18', // Saturday (8 nights: Fri, Sat, Sun, Mon, Tue, Wed, Thu, Fri)
        nightlyRate: 100,
        weekendMultiplier: 1.2,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0.0,
        dailyPrices: [{ date: '2026-07-10', basePrice: 100, override: 150 }], // First Friday override
        minNights: 1,
      })

      // Breakdown:
      // 2026-07-10 (Fri): override 150
      // 2026-07-11 (Sat): 100 × 1.2 = 120
      // 2026-07-12-14 (Sun-Wed): 4 × 100 = 400
      // 2026-07-15 (Thu): 100
      // 2026-07-16 (Fri): 100 × 1.2 = 120
      // 2026-07-17 (Sat): 100 × 1.2 = 120
      // Total before discount: 150 + 120 + 400 + 100 + 120 + 120 = 1010
      // Discount: (1010 - 150) × 0.05 = 43 on 7 non-override nights
      // Final: 1010 - 43 = 967

      expect(result.total).toBe(967)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 15: Zero or negative nightly rate validation
     */
    it('should handle zero nightly rate', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-04',
        nightlyRate: 0,
        minNights: 1,
      })

      expect(result.total).toBe(0)
      expect(result.avgNightly).toBe(0)
      expect(result.error).toBeUndefined()
    })

    /**
     * Test 16: Single night booking
     */
    it('should handle single night booking', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-10',
        checkOutDate: '2026-07-11', // 1 night
        nightlyRate: 100,
        minNights: 1,
      })

      expect(result.total).toBe(100)
      expect(result.avgNightly).toBe(100)
      expect(result.breakdown.length).toBe(1)
      expect(result.error).toBeUndefined()
    })
  })

  describe('Edge cases and error handling', () => {
    /**
     * Test 17: Multiple overrides in same booking
     */
    it('should handle multiple daily price overrides', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-05', // 4 nights
        nightlyRate: 100,
        sevenNightDiscount: 0.05, // Won't apply (< 7 nights)
        dailyPrices: [
          { date: '2026-07-01', basePrice: 100, override: 150 },
          { date: '2026-07-02', basePrice: 100, override: 120 },
        ],
        minNights: 1,
      })

      // 150 + 120 + 100 + 100 = 470
      expect(result.total).toBe(470)
      const overrideItems = result.breakdown.filter((item) => item.component === 'override')
      expect(overrideItems.length).toBe(2)
    })

    /**
     * Test 18: Very high number of nights
     */
    it('should handle very long bookings (365+ nights)', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-01-01',
        checkOutDate: '2027-01-01', // 365 nights
        nightlyRate: 100,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0.1,
        minNights: 1,
      })

      // Should apply 28-night discount (10%)
      const totalWithoutDiscount = 365 * 100
      const expectedTotal = totalWithoutDiscount * 0.9 // 10% discount
      expect(result.total).toBe(expectedTotal)
      expect(result.avgNightly).toBe(90.0)
    })

    /**
     * Test 19: Breakdown contains all required fields
     */
    it('should ensure breakdown items contain all required fields', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-04',
        nightlyRate: 100,
        minNights: 1,
      })

      result.breakdown.forEach((item) => {
        expect(item).toHaveProperty('component')
        expect(item).toHaveProperty('nightCount')
        expect(item).toHaveProperty('ratePerNight')
        expect(item).toHaveProperty('value')
        expect(item).toHaveProperty('reason')
      })
    })

    /**
     * Test 20: No discount if sevenNightDiscount is 0
     */
    it('should not apply discount if discount rate is 0', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-08', // 7 nights
        nightlyRate: 100,
        sevenNightDiscount: 0, // No discount
        minNights: 1,
      })

      expect(result.total).toBe(700) // No discount applied
      const discountItems = result.breakdown.filter((item) => item.component === 'discount_7night')
      expect(discountItems.length).toBe(0)
    })
  })
})
