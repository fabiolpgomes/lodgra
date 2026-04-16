import { calculatePrice, ruleForDate, PricingRule } from '../getPriceForRange'
import { format } from 'date-fns'

describe('calculatePrice', () => {
  const today = new Date('2026-04-02')
  const checkIn = new Date('2026-04-05')
  const checkOut = new Date('2026-04-10') // 5 nights

  describe('propertyMinNights fallback', () => {
    it('should use propertyMinNights when no rules apply', () => {
      const result = calculatePrice([], 100, checkIn, checkOut, 3)
      expect(result.minNights).toBe(3)
      expect(result.total).toBe(500) // 5 nights × €100
    })

    it('should default to 1 night when no propertyMinNights provided', () => {
      const result = calculatePrice([], 100, checkIn, checkOut)
      expect(result.minNights).toBe(1)
    })

    it('should use propertyMinNights=1 as minimum default', () => {
      const result = calculatePrice([], 100, checkIn, checkOut, 1)
      expect(result.minNights).toBe(1)
    })
  })

  describe('precedence: rules override propertyMinNights', () => {
    it('should use rule min_nights when higher than property', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Summer Peak',
          start_date: '2026-04-01',
          end_date: '2026-04-30',
          price_per_night: 150,
          min_nights: 7, // Higher than property (3)
          created_at: '2026-04-01T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 3)
      expect(result.minNights).toBe(7) // Rule wins
    })

    it('should keep property min_nights when rule is lower', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Summer Peak',
          start_date: '2026-04-01',
          end_date: '2026-04-30',
          price_per_night: 150,
          min_nights: 2, // Lower than property (5)
          created_at: '2026-04-01T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 5)
      expect(result.minNights).toBe(5) // Property is more restrictive
    })

    it('should use max min_nights when multiple rules apply', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Rule 1',
          start_date: '2026-04-01',
          end_date: '2026-04-30',
          price_per_night: 100,
          min_nights: 3,
          created_at: '2026-04-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Rule 2 (higher)',
          start_date: '2026-04-05',
          end_date: '2026-04-10',
          price_per_night: 150,
          min_nights: 5, // Higher
          created_at: '2026-04-02T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 1)
      expect(result.minNights).toBe(5) // Max of all
    })
  })

  describe('price calculation', () => {
    it('should calculate total price correctly with no rules', () => {
      const result = calculatePrice([], 100, checkIn, checkOut, 1)
      expect(result.total).toBe(500) // 5 nights × €100
      expect(result.breakdown).toHaveLength(5)
      expect(result.breakdown[0].price).toBe(100)
    })

    it('should apply rule price to applicable nights', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Summer',
          start_date: '2026-04-05',
          end_date: '2026-04-09',
          price_per_night: 150,
          min_nights: 1,
          created_at: '2026-04-01T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 1)
      // 04-05, 04-06, 04-07, 04-08, 04-09 (5 nights all in rule)
      expect(result.total).toBe(750) // 5 × €150
    })

    it('should mix base price and rule price correctly', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Mid-period rule',
          start_date: '2026-04-07',
          end_date: '2026-04-08',
          price_per_night: 200,
          min_nights: 1,
          created_at: '2026-04-01T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 1)
      // 04-05: €100, 04-06: €100, 04-07: €200, 04-08: €200, 04-09: €100
      expect(result.total).toBe(700)
    })
  })

  describe('breakdown accuracy', () => {
    it('should provide accurate breakdown for each night', () => {
      const rules: PricingRule[] = [
        {
          id: '1',
          name: 'Weekend',
          start_date: '2026-04-08', // Wednesday
          end_date: '2026-04-09',   // Thursday
          price_per_night: 150,
          min_nights: 1,
          created_at: '2026-04-01T00:00:00Z',
        },
      ]
      const result = calculatePrice(rules, 100, checkIn, checkOut, 1)

      expect(result.breakdown[0]).toEqual({ date: '2026-04-05', price: 100 })
      expect(result.breakdown[1]).toEqual({ date: '2026-04-06', price: 100 })
      expect(result.breakdown[2]).toEqual({ date: '2026-04-07', price: 100 })
      expect(result.breakdown[3]).toEqual({ date: '2026-04-08', price: 150 })
      expect(result.breakdown[4]).toEqual({ date: '2026-04-09', price: 150 })
    })
  })
})

describe('ruleForDate', () => {
  it('should find applicable rule for a given date', () => {
    const rules: PricingRule[] = [
      {
        id: '1',
        name: 'Summer',
        start_date: '2026-06-01',
        end_date: '2026-08-31',
        price_per_night: 150,
        min_nights: 3,
        created_at: '2026-04-01T00:00:00Z',
      },
    ]
    const date = new Date('2026-07-15')
    const rule = ruleForDate(rules, date)
    expect(rule?.id).toBe('1')
    expect(rule?.price_per_night).toBe(150)
  })

  it('should return most recently created rule when multiple overlap', () => {
    const rules: PricingRule[] = [
      {
        id: '1',
        name: 'Old rule',
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        price_per_night: 100,
        min_nights: 1,
        created_at: '2026-03-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'New rule',
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        price_per_night: 150,
        min_nights: 2,
        created_at: '2026-04-02T00:00:00Z',
      },
    ]
    const date = new Date('2026-04-15')
    const rule = ruleForDate(rules, date)
    expect(rule?.id).toBe('2') // Most recent wins
  })

  it('should return null when no rule applies', () => {
    const rules: PricingRule[] = [
      {
        id: '1',
        name: 'Summer',
        start_date: '2026-06-01',
        end_date: '2026-08-31',
        price_per_night: 150,
        min_nights: 3,
        created_at: '2026-04-01T00:00:00Z',
      },
    ]
    const date = new Date('2026-05-15') // Outside rule range
    const rule = ruleForDate(rules, date)
    expect(rule).toBeNull()
  })
})
