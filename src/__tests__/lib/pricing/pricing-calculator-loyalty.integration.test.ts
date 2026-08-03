import { PricingCalculator } from '@/lib/pricing/pricing-calculator'

describe('PricingCalculator - Loyalty Discount Integration (Story 37.5)', () => {
  describe('Loyalty discount applied after duration discounts', () => {
    it('should apply loyalty discount (10%) after weekly discount (5%)', () => {
      // Scenario: €100/night × 7 nights = €700
      // - Semanal -5% = €665
      // - Fidelidade -10% (adicional) = €598.50

      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-08', // 7 nights
        nightlyRate: 100,
        weekendMultiplier: 1.0,
        sevenNightDiscount: 0.05, // 5% weekly discount
        twentyEightNightDiscount: 0,
        loyaltyDiscountPercentage: 10, // 10% loyalty
        isLoyalGuest: true,
        minNights: 1,
      } as any)

      // Base: €700
      // After 5% weekly: €665
      // After 10% loyalty: €598.50
      expect(result.total).toBe(598.5)

      // Check breakdown includes loyalty discount
      const loyaltyItem = result.breakdown.find((item) => item.component === 'discount_loyalty')
      expect(loyaltyItem).toBeDefined()
      expect(loyaltyItem?.value).toBe(-66.5) // 10% of €665
    })

    it('should not apply loyalty discount when isLoyalGuest is false', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-08', // 7 nights
        nightlyRate: 100,
        weekendMultiplier: 1.0,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0,
        loyaltyDiscountPercentage: 10,
        isLoyalGuest: false, // Not loyal
        minNights: 1,
      } as any)

      // Should only apply weekly discount, not loyalty
      expect(result.total).toBe(665)

      const loyaltyItem = result.breakdown.find((item) => item.component === 'discount_loyalty')
      expect(loyaltyItem).toBeUndefined()
    })

    it('should not apply loyalty discount when percentage is 0', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-08', // 7 nights
        nightlyRate: 100,
        weekendMultiplier: 1.0,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0,
        loyaltyDiscountPercentage: 0, // No loyalty discount configured
        isLoyalGuest: true,
        minNights: 1,
      } as any)

      expect(result.total).toBe(665)

      const loyaltyItem = result.breakdown.find((item) => item.component === 'discount_loyalty')
      expect(loyaltyItem).toBeUndefined()
    })

    it('should apply loyalty discount (10%) after monthly discount (15%)', () => {
      // Scenario: €100/night × 30 nights = €3000
      // - Mensal -15% = €2550
      // - Fidelidade -10% (adicional) = €2295

      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-31', // 30 nights
        nightlyRate: 100,
        weekendMultiplier: 1.0,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0.15, // 15% monthly discount
        loyaltyDiscountPercentage: 10, // 10% loyalty
        isLoyalGuest: true,
        minNights: 1,
      } as any)

      // Base: €3000
      // After 15% monthly: €2550
      // After 10% loyalty: €2295
      expect(result.total).toBe(2295)

      const monthlyItem = result.breakdown.find((item) => item.component === 'discount_28night')
      const loyaltyItem = result.breakdown.find((item) => item.component === 'discount_loyalty')

      expect(monthlyItem?.value).toBe(-450) // 15% of €3000
      expect(loyaltyItem?.value).toBe(-255) // 10% of €2550 (after monthly)
    })

    it('should correctly display loyalty discount in breakdown', () => {
      const result = PricingCalculator.calculateBookingPrice({
        checkInDate: '2026-08-01',
        checkOutDate: '2026-08-08', // 7 nights
        nightlyRate: 100,
        weekendMultiplier: 1.0,
        sevenNightDiscount: 0.05,
        twentyEightNightDiscount: 0,
        loyaltyDiscountPercentage: 10,
        isLoyalGuest: true,
        minNights: 1,
      } as any)

      const loyaltyItem = result.breakdown.find((item) => item.component === 'discount_loyalty')
      expect(loyaltyItem?.reason).toContain('Loyalty discount')
      expect(loyaltyItem?.reason).toContain('10%')
      expect(loyaltyItem?.reason).toContain('returning guest')
    })
  })
})
