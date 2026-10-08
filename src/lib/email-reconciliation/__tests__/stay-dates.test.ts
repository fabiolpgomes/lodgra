import { resolveStayYear } from '../stay-dates'

describe('resolveStayYear', () => {
  it('moves a guessed past year forward to the stay after the e-mail (HMQT2DETSM)', () => {
    expect(resolveStayYear('2024-10-11', '2024-10-19', '2026-10-05T09:12:00Z'))
      .toEqual({ check_in: '2026-10-11', check_out: '2026-10-19', adjusted: true })
  })
  it('keeps correct dates untouched', () => {
    expect(resolveStayYear('2026-10-11', '2026-10-19', '2026-10-05T09:12:00Z'))
      .toEqual({ check_in: '2026-10-11', check_out: '2026-10-19', adjusted: false })
  })
  it('accepts a same-day booking received late at night in another time zone', () => {
    expect(resolveStayYear('2026-10-05', '2026-10-07', '2026-10-06T00:30:00Z').adjusted).toBe(false)
  })
  it('handles stays across New Year', () => {
    expect(resolveStayYear('2024-12-28', '2024-01-03', '2026-11-01T00:00:00Z'))
      .toEqual({ check_in: '2026-12-28', check_out: '2027-01-03', adjusted: true })
  })
  it('moves a stay booked in December for January to the next year', () => {
    expect(resolveStayYear('2026-01-10', '2026-01-15', '2026-12-20T10:00:00Z'))
      .toEqual({ check_in: '2027-01-10', check_out: '2027-01-15', adjusted: true })
  })
  it('sends impossible dates to review instead of guessing', () => {
    expect(resolveStayYear('2024-02-29', '2024-03-02', '2026-01-01T00:00:00Z'))
      .toEqual({ check_in: null, check_out: null, adjusted: true })
  })
  it('leaves partial data alone', () => {
    expect(resolveStayYear(null, null, '2026-10-05T00:00:00Z').adjusted).toBe(false)
    expect(resolveStayYear('2024-10-11', null, '2026-10-05T00:00:00Z')).toEqual({ check_in: '2026-10-11', check_out: null, adjusted: true })
  })
})
