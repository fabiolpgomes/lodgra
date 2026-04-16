describe('Calendar - FullCalendar event date transformation', () => {
  function transformCheckoutDate(checkOut: string): string {
    // FullCalendar: end date is exclusive, so add 1 day to make checkout date visible
    const endDate = new Date(checkOut)
    endDate.setDate(endDate.getDate() + 1)
    return endDate.toISOString().slice(0, 10)
  }

  it('should extend checkout by 1 day for same-day reservations', () => {
    const result = transformCheckoutDate('2026-04-04')
    expect(result).toBe('2026-04-05')
  })

  it('should extend checkout by 1 day for multi-day reservations', () => {
    const result = transformCheckoutDate('2026-04-06')
    expect(result).toBe('2026-04-07')
  })

  it('should handle month boundaries correctly', () => {
    // April 30 + 1 day = May 1
    const result = transformCheckoutDate('2026-04-30')
    expect(result).toBe('2026-05-01')
  })

  it('should handle year boundaries correctly', () => {
    // Dec 31 + 1 day = Jan 1 (next year)
    const result = transformCheckoutDate('2026-12-31')
    expect(result).toBe('2027-01-01')
  })

  it('should handle leap year correctly', () => {
    // Feb 29 (leap year) + 1 day = Mar 1
    const result = transformCheckoutDate('2024-02-29')
    expect(result).toBe('2024-03-01')
  })
})
