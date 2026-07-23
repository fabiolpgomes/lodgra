import { calculateServiceFeeAmount, nightsBetween } from '../serviceFee'

describe('calculateServiceFeeAmount', () => {
  it('returns 0 when property is null/undefined', () => {
    expect(calculateServiceFeeAmount(null, 3)).toBe(0)
    expect(calculateServiceFeeAmount(undefined, 3)).toBe(0)
  })

  it('returns 0 when nights is 0 or negative', () => {
    const property = { cleaning_fee: 70, cleaning_fee_type: 'per_stay', pet_fee: null, pet_fee_type: null }
    expect(calculateServiceFeeAmount(property, 0)).toBe(0)
    expect(calculateServiceFeeAmount(property, -2)).toBe(0)
  })

  it('returns 0 when property has no fees configured', () => {
    const property = { cleaning_fee: null, cleaning_fee_type: null, pet_fee: null, pet_fee_type: null }
    expect(calculateServiceFeeAmount(property, 5)).toBe(0)
  })

  it('sums cleaning_fee once when per_stay regardless of nights', () => {
    const property = { cleaning_fee: 70, cleaning_fee_type: 'per_stay', pet_fee: null, pet_fee_type: null }
    expect(calculateServiceFeeAmount(property, 1)).toBe(70)
    expect(calculateServiceFeeAmount(property, 10)).toBe(70)
  })

  it('multiplies cleaning_fee by nights when per_night', () => {
    const property = { cleaning_fee: 10, cleaning_fee_type: 'per_night', pet_fee: null, pet_fee_type: null }
    expect(calculateServiceFeeAmount(property, 4)).toBe(40)
  })

  it('sums pet_fee once when per_stay', () => {
    const property = { cleaning_fee: null, cleaning_fee_type: null, pet_fee: 50, pet_fee_type: 'per_stay' }
    expect(calculateServiceFeeAmount(property, 7)).toBe(50)
  })

  it('multiplies pet_fee by nights when per_night', () => {
    const property = { cleaning_fee: null, cleaning_fee_type: null, pet_fee: 5, pet_fee_type: 'per_night' }
    expect(calculateServiceFeeAmount(property, 3)).toBe(15)
  })

  it('combines cleaning (per_stay) + pet (per_night) fees', () => {
    const property = { cleaning_fee: 70, cleaning_fee_type: 'per_stay', pet_fee: 10, pet_fee_type: 'per_night' }
    // 70 (once) + 10*5 (per night) = 120
    expect(calculateServiceFeeAmount(property, 5)).toBe(120)
  })

  it('combines cleaning (per_night) + pet (per_stay) fees', () => {
    const property = { cleaning_fee: 15, cleaning_fee_type: 'per_night', pet_fee: 40, pet_fee_type: 'per_stay' }
    // 15*3 + 40 = 85
    expect(calculateServiceFeeAmount(property, 3)).toBe(85)
  })

  it('treats fee <= 0 as no fee applicable', () => {
    const property = { cleaning_fee: 0, cleaning_fee_type: 'per_night', pet_fee: -5, pet_fee_type: 'per_stay' }
    expect(calculateServiceFeeAmount(property, 3)).toBe(0)
  })

  it('rounds to 2 decimal places to avoid floating point drift', () => {
    const property = { cleaning_fee: 10.005, cleaning_fee_type: 'per_night', pet_fee: null, pet_fee_type: null }
    expect(calculateServiceFeeAmount(property, 3)).toBeCloseTo(30.02, 2)
  })
})

describe('nightsBetween', () => {
  it('returns 0 when either date is null/undefined', () => {
    expect(nightsBetween(null, '2026-08-10')).toBe(0)
    expect(nightsBetween('2026-08-10', undefined)).toBe(0)
    expect(nightsBetween(null, null)).toBe(0)
  })

  it('returns 0 for invalid date strings', () => {
    expect(nightsBetween('not-a-date', '2026-08-10')).toBe(0)
  })

  it('returns 0 when check_out <= check_in', () => {
    expect(nightsBetween('2026-08-10', '2026-08-10')).toBe(0)
    expect(nightsBetween('2026-08-10', '2026-08-05')).toBe(0)
  })

  it('computes correct number of nights for a normal stay', () => {
    expect(nightsBetween('2026-08-10', '2026-08-15')).toBe(5)
  })

  it('accepts Date objects', () => {
    expect(nightsBetween(new Date('2026-08-10T00:00:00Z'), new Date('2026-08-13T00:00:00Z'))).toBe(3)
  })
})
