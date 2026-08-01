import { ReservationPriceCalculator } from '../reservation-price-calculator'

describe('ReservationPriceCalculator', () => {
  describe('Basic price calculation', () => {
    it('should calculate simple reservation without discounts', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20',
        basePrice: 100,
      })

      expect(result.nights).toBe(5)
      expect(result.pricePerNight).toBe(100)
      expect(result.subtotal).toBe(500)
      expect(result.volumeDiscountAmount).toBe(0)
      expect(result.loyaltyDiscountAmount).toBe(0)
      expect(result.feesTotal).toBe(0)
      expect(result.finalPrice).toBe(500)
    })
  })

  describe('Volume discounts (EXCLUSIVE)', () => {
    it('should apply weekly discount for 7-27 nights', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22', // 7 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        monthlyDiscountPercent: 20,
      })

      expect(result.nights).toBe(7)
      expect(result.volumeDiscountType).toBe('weekly')
      expect(result.volumeDiscountPercent).toBe(10)
      expect(result.volumeDiscountAmount).toBe(70) // 700 * 10% = 70
      expect(result.afterVolumeDiscount).toBe(630)
      expect(result.finalPrice).toBe(630)
    })

    it('should apply monthly discount for 28+ nights (EXCLUSIVE)', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-01',
        checkOut: '2026-08-29', // 28 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        monthlyDiscountPercent: 20,
      })

      expect(result.nights).toBe(28)
      expect(result.volumeDiscountType).toBe('monthly')
      expect(result.volumeDiscountPercent).toBe(20)
      expect(result.volumeDiscountAmount).toBe(560) // 2800 * 20% = 560
      expect(result.afterVolumeDiscount).toBe(2240)
      expect(result.finalPrice).toBe(2240)
    })

    it('should NOT apply any discount for <7 nights', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20', // 5 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        monthlyDiscountPercent: 20,
      })

      expect(result.nights).toBe(5)
      expect(result.volumeDiscountType).toBe('none')
      expect(result.volumeDiscountAmount).toBe(0)
      expect(result.finalPrice).toBe(500)
    })
  })

  describe('Loyalty discount (CASCADE)', () => {
    it('should apply loyalty discount on top of volume discount', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22', // 7 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        loyaltyDiscountPercent: 5,
        isLoyaltyGuest: true,
      })

      expect(result.nights).toBe(7)
      expect(result.subtotal).toBe(700)
      expect(result.volumeDiscountAmount).toBe(70) // 700 * 10% = 70
      expect(result.afterVolumeDiscount).toBe(630)
      expect(result.loyaltyDiscountAmount).toBe(31.5) // 630 * 5% = 31.5
      expect(result.afterLoyaltyDiscount).toBe(598.5)
      expect(result.finalPrice).toBe(598.5)
    })

    it('should NOT apply loyalty discount if not loyalty guest', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22', // 7 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        loyaltyDiscountPercent: 5,
        isLoyaltyGuest: false,
      })

      expect(result.loyaltyDiscountAmount).toBe(0)
      expect(result.finalPrice).toBe(630)
    })

    it('should apply both volume and loyalty in cascade (28+ nights)', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-01',
        checkOut: '2026-08-29', // 28 nights
        basePrice: 100,
        monthlyDiscountPercent: 20,
        loyaltyDiscountPercent: 5,
        isLoyaltyGuest: true,
      })

      expect(result.nights).toBe(28)
      expect(result.subtotal).toBe(2800)
      expect(result.volumeDiscountAmount).toBe(560) // 2800 * 20%
      expect(result.afterVolumeDiscount).toBe(2240)
      expect(result.loyaltyDiscountAmount).toBe(112) // 2240 * 5%
      expect(result.afterLoyaltyDiscount).toBe(2128)
      expect(result.finalPrice).toBe(2128)
    })
  })

  describe('Fees', () => {
    it('should add fees to final price', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20',
        basePrice: 100,
        fees: [
          { name: 'Limpeza', amount: 50 },
          { name: 'Pet', amount: 25 },
        ],
      })

      expect(result.subtotal).toBe(500)
      expect(result.feesTotal).toBe(75)
      expect(result.finalPrice).toBe(575)
    })

    it('should add fees after all discounts', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22', // 7 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        fees: [{ name: 'Limpeza', amount: 50 }],
      })

      expect(result.subtotal).toBe(700)
      expect(result.volumeDiscountAmount).toBe(70)
      expect(result.afterVolumeDiscount).toBe(630)
      expect(result.feesTotal).toBe(50)
      expect(result.finalPrice).toBe(680)
    })
  })

  describe('Price source hierarchy', () => {
    it('should use daily_prices when available', () => {
      const dailyPrices = new Map([
        ['2026-08-15', 120],
        ['2026-08-16', 120],
        ['2026-08-17', 120],
        ['2026-08-18', 120],
        ['2026-08-19', 120],
      ])

      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20',
        basePrice: 100,
        dailyPrices,
      })

      expect(result.priceSource).toBe('daily_prices')
      expect(result.pricePerNight).toBe(120)
      expect(result.finalPrice).toBe(600)
    })

    it('should use pricing_rules when daily_prices not complete', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20',
        basePrice: 100,
        pricingRules: [
          {
            startDate: '2026-08-01',
            endDate: '2026-08-31',
            pricePerNight: 110,
          },
        ],
      })

      expect(result.priceSource).toBe('pricing_rules')
      expect(result.pricePerNight).toBe(110)
      expect(result.finalPrice).toBe(550)
    })

    it('should fallback to base_price when no overrides', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-20',
        basePrice: 100,
      })

      expect(result.priceSource).toBe('base_price')
      expect(result.pricePerNight).toBe(100)
      expect(result.finalPrice).toBe(500)
    })
  })

  describe('Edge cases and validation', () => {
    it('should throw error for invalid dates', () => {
      expect(() => {
        ReservationPriceCalculator.calculate({
          propertyId: 'prop-1',
          checkIn: '2026-08-20',
          checkOut: '2026-08-15', // checkOut before checkIn
          basePrice: 100,
        })
      }).toThrow()
    })

    it('should throw error for invalid base price', () => {
      expect(() => {
        ReservationPriceCalculator.calculate({
          propertyId: 'prop-1',
          checkIn: '2026-08-15',
          checkOut: '2026-08-20',
          basePrice: 0, // Invalid
        })
      }).toThrow()
    })

    it('should handle same-day checkout correctly', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-16', // 1 night
        basePrice: 100,
      })

      expect(result.nights).toBe(1)
      expect(result.finalPrice).toBe(100)
    })

    it('should round prices correctly to 2 decimal places', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22', // 7 nights
        basePrice: 100,
        weeklyDiscountPercent: 10,
        loyaltyDiscountPercent: 5,
        isLoyaltyGuest: true,
      })

      // Check that all prices are properly rounded
      expect(result.subtotal).toBe(700)
      expect(result.volumeDiscountAmount).toBe(70)
      expect(result.loyaltyDiscountAmount).toBe(31.5)
      expect(result.finalPrice).toBe(598.5)
    })
  })

  describe('Breakdown and applied rules', () => {
    it('should generate breakdown string', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22',
        basePrice: 100,
        weeklyDiscountPercent: 10,
        fees: [{ name: 'Limpeza', amount: 50 }],
      })

      expect(result.breakdown).toContain('Preço por Noite')
      expect(result.breakdown).toContain('Nº de Noites: 7')
      expect(result.breakdown).toContain('Desconto Semanal')
      expect(result.breakdown).toContain('Limpeza')
      expect(result.breakdown).toContain('TOTAL')
    })

    it('should list applied rules', () => {
      const result = ReservationPriceCalculator.calculate({
        propertyId: 'prop-1',
        checkIn: '2026-08-15',
        checkOut: '2026-08-22',
        basePrice: 100,
        weeklyDiscountPercent: 10,
        loyaltyDiscountPercent: 5,
        isLoyaltyGuest: true,
        fees: [{ name: 'Limpeza', amount: 50 }],
      })

      expect(result.appliedRules).toContain('Estadia: 7 noites')
      expect(result.appliedRules.some((r) => r.includes('Semanal'))).toBe(true)
      expect(result.appliedRules.some((r) => r.includes('Fidelidade'))).toBe(true)
      expect(result.appliedRules.some((r) => r.includes('Limpeza'))).toBe(true)
    })
  })
})
