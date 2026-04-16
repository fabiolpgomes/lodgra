import { calcManagementFee, calcOwnerNet, calcNetAmount } from '@/lib/financial/calculations'

describe('calcManagementFee()', () => {
  it('returns 0 when percentage is 0', () => {
    expect(calcManagementFee(1000, 0)).toBe(0)
  })

  it('returns 0 when percentage is negative', () => {
    expect(calcManagementFee(1000, -5)).toBe(0)
  })

  it('calculates 20% of 1000 correctly', () => {
    expect(calcManagementFee(1000, 20)).toBe(200)
  })

  it('calculates 15% of gross revenue', () => {
    expect(calcManagementFee(500, 15)).toBe(75)
  })

  it('handles decimal percentages', () => {
    expect(calcManagementFee(1000, 12.5)).toBe(125)
  })

  it('returns 0 when gross revenue is 0', () => {
    expect(calcManagementFee(0, 20)).toBe(0)
  })
})

describe('calcOwnerNet()', () => {
  it('returns full amount when management_percentage is 0', () => {
    expect(calcOwnerNet(1000, 0)).toBe(1000)
  })

  it('returns gross minus 20% management fee', () => {
    expect(calcOwnerNet(1000, 20)).toBe(800)
  })

  it('returns gross minus 15% management fee', () => {
    expect(calcOwnerNet(500, 15)).toBe(425)
  })

  it('returns 0 when gross revenue is 0', () => {
    expect(calcOwnerNet(0, 20)).toBe(0)
  })

  it('owner_net equals gross minus management_fee', () => {
    const gross = 850
    const pct = 18
    expect(calcOwnerNet(gross, pct)).toBe(gross - calcManagementFee(gross, pct))
  })
})

describe('calcNetAmount()', () => {
  it('deducts 15% platform fee from total', () => {
    expect(calcNetAmount(100, 15)).toBe(85)
  })

  it('deducts 3% Airbnb-style platform fee', () => {
    expect(calcNetAmount(1000, 3)).toBe(970)
  })

  it('returns full amount when platform fee is 0', () => {
    expect(calcNetAmount(500, 0)).toBe(500)
  })

  it('returns full amount when platform fee is negative', () => {
    expect(calcNetAmount(500, -10)).toBe(500)
  })

  it('returns 0 when total amount is 0', () => {
    expect(calcNetAmount(0, 15)).toBe(0)
  })

  it('handles decimal platform fee percentage', () => {
    expect(calcNetAmount(200, 2.5)).toBe(195)
  })
})
