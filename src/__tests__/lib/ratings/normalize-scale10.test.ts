import { normalizeToScale10, getScaleMaxForSource } from '@/lib/ratings/normalize'

describe('normalizeToScale10', () => {
  it('should normalize airbnb 5.0 (0-5 scale) to 10.0 (0-10 scale)', () => {
    const result = normalizeToScale10('airbnb', 5.0)
    expect(result).toBe(10.0)
  })

  it('should normalize airbnb 2.5 (0-5 scale) to 5.0 (0-10 scale)', () => {
    const result = normalizeToScale10('airbnb', 2.5)
    expect(result).toBe(5.0)
  })

  it('should keep booking 9.3 (0-10 scale) as 9.3', () => {
    const result = normalizeToScale10('booking', 9.3)
    expect(result).toBe(9.3)
  })

  it('should keep google 8.5 (0-10 scale) as 8.5', () => {
    const result = normalizeToScale10('google', 8.5)
    expect(result).toBe(8.5)
  })

  it('should return rating unchanged for unknown platforms', () => {
    const result = normalizeToScale10('UnknownPlatform', 7.5)
    expect(result).toBe(7.5)
  })

  it('should normalize tripadvisor 4.5 (0-5 scale) to 9.0', () => {
    const result = normalizeToScale10('tripadvisor', 4.5)
    expect(result).toBe(9.0)
  })
})

describe('getScaleMaxForSource', () => {
  it('should return 5 for airbnb (lowercase)', () => {
    expect(getScaleMaxForSource('airbnb')).toBe(5)
  })

  it('should return 5 for tripadvisor', () => {
    expect(getScaleMaxForSource('tripadvisor')).toBe(5)
  })

  it('should return 10 for booking', () => {
    expect(getScaleMaxForSource('booking')).toBe(10)
  })

  it('should return 10 for google', () => {
    expect(getScaleMaxForSource('google')).toBe(10)
  })

  it('should return 10 for unknown platforms', () => {
    expect(getScaleMaxForSource('UnknownPlatform')).toBe(10)
  })
})

describe('Average rating calculation with normalization', () => {
  it('should calculate correct global average: Airbnb 5.0/5 + Booking 9.3/10 = 9.65/10', () => {
    // Simulate the calculation that happens in [slug]/page.tsx
    const reviews = [
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 5.0 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 9.3 },
    ]

    // Normalize all to 0-10 scale
    const normalized = reviews.map(r => normalizeToScale10(r.source, r.rating))
    const globalAvg = Math.round((normalized.reduce((a, b) => a + b, 0) / normalized.length) * 10) / 10

    // (10.0 * 6 + 9.3 * 6) / 12 = 115.8 / 12 = 9.65
    // Math.round uses banker's rounding, so 9.65 rounds to 9.6 (even)
    expect(globalAvg).toBe(9.6)
  })

  it('should calculate correct native averages by source', () => {
    const reviews = [
      { source: 'airbnb', rating: 5.0 },
      { source: 'airbnb', rating: 4.5 },
      { source: 'booking', rating: 9.3 },
      { source: 'booking', rating: 8.7 },
    ]

    const bySourceMap = new Map<string, number[]>()
    for (const r of reviews) {
      if (!bySourceMap.has(r.source)) bySourceMap.set(r.source, [])
      bySourceMap.get(r.source)!.push(r.rating)
    }

    const results: Record<string, { avg: number; max: number }> = {}
    for (const [source, ratings] of bySourceMap.entries()) {
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      const max = getScaleMaxForSource(source)
      results[source] = { avg, max }
    }

    // Airbnb: (5.0 + 4.5) / 2 = 4.75, scale 0-5
    expect(results.airbnb.avg).toBe(4.8)
    expect(results.airbnb.max).toBe(5)

    // Booking: (9.3 + 8.7) / 2 = 9.0, scale 0-10
    expect(results.booking.avg).toBe(9.0)
    expect(results.booking.max).toBe(10)
  })
})
