import { getReservationPlatformLabel } from '@/lib/reservations/platform'

describe('getReservationPlatformLabel', () => {
  it.each([
    ['airbnb', 'Airbnb'],
    ['booking', 'Booking.com'],
    ['booking_api', 'Booking API'],
    ['flatio', 'Flatio'],
    ['vrbo', 'VRBO'],
  ])('normalizes %s as %s', (source, expected) => {
    expect(getReservationPlatformLabel(source)).toBe(expected)
  })

  it('keeps manual only as the fallback for an unknown origin', () => {
    expect(getReservationPlatformLabel('manual')).toBe('MANUAL')
    expect(getReservationPlatformLabel(null)).toBe('MANUAL')
    expect(getReservationPlatformLabel('')).toBe('MANUAL')
  })

  it('preserves an explicit unknown source instead of silently changing it to manual', () => {
    expect(getReservationPlatformLabel('custom_channel')).toBe('CUSTOM_CHANNEL')
  })
})
