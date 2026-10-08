import { toLocalDate } from '../date-only'

describe('toLocalDate', () => {
  it('keeps the calendar day of a date-only value in any time zone', () => {
    const date = toLocalDate('2026-10-11')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 11])
  })
  it('leaves timestamps and Date objects untouched', () => {
    const instant = '2026-10-11T22:30:00Z'
    expect(toLocalDate(instant).toISOString()).toBe('2026-10-11T22:30:00.000Z')
    const value = new Date()
    expect(toLocalDate(value)).toBe(value)
  })
})
