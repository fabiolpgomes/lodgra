import { calculatePropertyPrice } from '../property-price-calculator'

function createSingleRowQuery(data: any) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    maybeSingle: jest.fn(async () => ({ data, error: null })),
  }

  return query
}

function createListQuery(data: any[]) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    lte: jest.fn(() => query),
    gte: jest.fn(() => query),
    lt: jest.fn(() => query),
    in: jest.fn(() => query),
    order: jest.fn(async () => ({ data, error: null })),
  }

  return query
}

function createSupabaseMock(tables: Record<string, any>) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'properties') {
        return createSingleRowQuery(tables.properties ?? null)
      }

      if (table === 'property_prices') {
        return createSingleRowQuery(tables.property_prices ?? null)
      }

      if (table === 'pricing_rules') {
        return createListQuery(tables.pricing_rules ?? [])
      }

      if (table === 'daily_prices') {
        return createListQuery(tables.daily_prices ?? [])
      }

      if (table === 'property_discounts') {
        return createListQuery(tables.property_discounts ?? [])
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }
}

describe('calculatePropertyPrice', () => {
  it('calculates a mixed stay and applies weekly discount', async () => {
    const supabase = createSupabaseMock({
      properties: { id: 'prop-123', base_price: 100 },
      property_prices: { base_price: 100, weekend_price: 150 },
      pricing_rules: [
        {
          start_date: '2026-07-05',
          end_date: '2026-07-06',
          price_per_night: 160,
        },
      ],
      daily_prices: [{ date: '2026-07-07', base_price: 180 }],
      property_discounts: [{ discount_type: 'weekly', percentage: 21 }],
    })

    const result = await calculatePropertyPrice(
      'prop-123',
      '2026-07-01',
      '2026-07-08',
      supabase as any
    )

    expect(result.baseTotal).toBe(1000)
    expect(result.discountApplied).toBe(true)
    expect(result.discountType).toBe('weekly')
    expect(result.discountPercentage).toBe(21)
    expect(result.discountAmount).toBe(210)
    expect(result.finalTotal).toBe(790)
    expect(result.breakdown).toEqual([
      { date: '2026-07-01', price: 100 },
      { date: '2026-07-02', price: 100 },
      { date: '2026-07-03', price: 150 },
      { date: '2026-07-04', price: 150 },
      { date: '2026-07-05', price: 160 },
      { date: '2026-07-06', price: 160 },
      { date: '2026-07-07', price: 180 },
    ])
  })

  it('applies monthly discount precedence for 28 nights', async () => {
    const supabase = createSupabaseMock({
      properties: { id: 'prop-123', base_price: 100 },
      property_prices: { base_price: 100, weekend_price: null },
      pricing_rules: [],
      daily_prices: [],
      property_discounts: [
        { discount_type: 'weekly', percentage: 21 },
        { discount_type: 'monthly', percentage: 55 },
      ],
    })

    const result = await calculatePropertyPrice(
      'prop-123',
      '2026-07-01',
      '2026-07-29',
      supabase as any
    )

    expect(result.baseTotal).toBe(2800)
    expect(result.discountApplied).toBe(true)
    expect(result.discountType).toBe('monthly')
    expect(result.discountPercentage).toBe(55)
    expect(result.discountAmount).toBe(1540)
    expect(result.finalTotal).toBe(1260)
  })

  it('returns base price when no discount is configured', async () => {
    const supabase = createSupabaseMock({
      properties: { id: 'prop-123', base_price: 100 },
      property_prices: { base_price: 100, weekend_price: null },
      pricing_rules: [],
      daily_prices: [],
      property_discounts: [],
    })

    const result = await calculatePropertyPrice(
      'prop-123',
      '2026-07-01',
      '2026-07-05',
      supabase as any
    )

    expect(result.baseTotal).toBe(400)
    expect(result.discountApplied).toBe(false)
    expect(result.discountType).toBeNull()
    expect(result.discountAmount).toBe(0)
    expect(result.finalTotal).toBe(400)
  })

  it('rejects invalid date ranges', async () => {
    await expect(
      calculatePropertyPrice('prop-123', '2026-07-10', '2026-07-05', {} as any)
    ).rejects.toMatchObject({
      status: 400,
    })
  })
})
