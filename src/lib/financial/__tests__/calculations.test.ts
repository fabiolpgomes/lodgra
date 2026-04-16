import { calcManagementFee, calcOwnerNet, calcNetAmount } from '../calculations'

describe('calcManagementFee', () => {
  it('calculates 20% management fee correctly', () => {
    expect(calcManagementFee(1000, 20)).toBe(200)
  })

  it('calculates 15% management fee correctly', () => {
    expect(calcManagementFee(500, 15)).toBe(75)
  })

  it('returns 0 when percentage is 0', () => {
    expect(calcManagementFee(1000, 0)).toBe(0)
  })

  it('returns 0 when percentage is negative', () => {
    expect(calcManagementFee(1000, -5)).toBe(0)
  })

  it('returns 0 when gross revenue is 0', () => {
    expect(calcManagementFee(0, 20)).toBe(0)
  })
})

describe('calcOwnerNet', () => {
  it('calculates owner net with 20% management fee', () => {
    expect(calcOwnerNet(1000, 20)).toBe(800)
  })

  it('returns full gross when management_percentage is 0', () => {
    expect(calcOwnerNet(1000, 0)).toBe(1000)
  })

  it('returns full gross when management_percentage is negative', () => {
    expect(calcOwnerNet(1000, -10)).toBe(1000)
  })

  it('returns 0 when gross revenue is 0', () => {
    expect(calcOwnerNet(0, 20)).toBe(0)
  })

  it('is consistent: owner_net + management_fee = gross', () => {
    const gross = 850
    const pct = 18
    expect(calcOwnerNet(gross, pct) + calcManagementFee(gross, pct)).toBeCloseTo(gross)
  })
})

describe('calcNetAmount', () => {
  it('deducts 15% platform fee correctly', () => {
    expect(calcNetAmount(100, 15)).toBe(85)
  })

  it('deducts 3% Airbnb fee correctly', () => {
    expect(calcNetAmount(200, 3)).toBeCloseTo(194)
  })

  it('returns full amount when platform fee is 0', () => {
    expect(calcNetAmount(500, 0)).toBe(500)
  })

  it('returns full amount when platform fee is negative', () => {
    expect(calcNetAmount(500, -5)).toBe(500)
  })
})
