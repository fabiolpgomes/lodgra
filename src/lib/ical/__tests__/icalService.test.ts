import { isBlockedEvent } from '../icalService'

describe('isBlockedEvent', () => {
  it('returns true for "not available" keyword', () => {
    expect(isBlockedEvent({ summary: 'Not available' })).toBe(true)
  })

  it('returns true for "blocked" keyword', () => {
    expect(isBlockedEvent({ summary: 'Blocked' })).toBe(true)
  })

  it('returns true for "Airbnb (Not available)"', () => {
    expect(isBlockedEvent({ summary: 'Airbnb (Not available)' })).toBe(true)
  })

  it('returns true for "fechado" keyword', () => {
    expect(isBlockedEvent({ summary: 'Fechado' })).toBe(true)
  })

  it('returns true for empty summary', () => {
    expect(isBlockedEvent({ summary: '' })).toBe(true)
  })

  it('returns true when summary is missing', () => {
    expect(isBlockedEvent({})).toBe(true)
  })

  it('returns true when blocked keyword is in description', () => {
    expect(isBlockedEvent({ summary: 'Reserva', description: 'maintenance period' })).toBe(true)
  })

  it('returns false for a valid guest reservation', () => {
    expect(isBlockedEvent({ summary: 'João Silva' })).toBe(false)
  })

  it('returns false for "Reserved" (Airbnb real booking)', () => {
    expect(isBlockedEvent({ summary: 'Reserved' })).toBe(false)
  })

  it('returns true for "CLOSED" — platform-level exception handled by importICalFromUrl caller', () => {
    // isBlockedEvent correctly flags "closed" as blocked.
    // Booking.com/Flatio feeds bypass this filter at the import level (isPlatformFeed && !isAirbnbFeed).
    expect(isBlockedEvent({ summary: 'CLOSED' })).toBe(true)
  })

  it('returns true when TRANSP is TRANSPARENT', () => {
    const mockComponent = {
      getFirstPropertyValue: (prop: string) => prop === 'transp' ? 'TRANSPARENT' : null
    }
    expect(isBlockedEvent({ summary: 'Some Event', component: mockComponent })).toBe(true)
  })

  it('returns false when TRANSP is OPAQUE', () => {
    const mockComponent = {
      getFirstPropertyValue: (prop: string) => prop === 'transp' ? 'OPAQUE' : null
    }
    expect(isBlockedEvent({ summary: 'João Silva', component: mockComponent })).toBe(false)
  })
})
