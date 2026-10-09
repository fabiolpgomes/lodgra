import { formatDateOnly, toLocalDate } from '../date-only'

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

describe('formatDateOnly', () => {
  it('formats a calendar day as DD/MM/YYYY without shifting it', () => {
    expect(formatDateOnly('2026-10-09')).toBe('09/10/2026')
    expect(formatDateOnly('2026-01-01')).toBe('01/01/2026')
    expect(formatDateOnly('2026-12-31')).toBe('31/12/2026')
  })

  it('accepts a midnight ISO timestamp that came from a date column', () => {
    expect(formatDateOnly('2026-10-09T00:00:00Z')).toBe('09/10/2026')
    expect(formatDateOnly('2026-10-09T00:00:00.000Z')).toBe('09/10/2026')
  })

  it('refuses real timestamps and garbage instead of guessing a day', () => {
    expect(formatDateOnly('2026-10-09T23:30:00Z')).toBe('')
    expect(formatDateOnly('09/10/2026')).toBe('')
    expect(formatDateOnly('not a date', '—')).toBe('—')
    expect(formatDateOnly('')).toBe('')
    expect(formatDateOnly(null, '—')).toBe('—')
    expect(formatDateOnly(undefined)).toBe('')
  })

  it('formats a Date object with its local calendar day', () => {
    expect(formatDateOnly(new Date(2026, 9, 9))).toBe('09/10/2026')
    expect(formatDateOnly(toLocalDate('2026-10-09'))).toBe('09/10/2026')
    expect(formatDateOnly(new Date('invalid'), '—')).toBe('—')
  })
})

