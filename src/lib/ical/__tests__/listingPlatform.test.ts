import { normalizeListingPlatform } from '../listingPlatform'
import { buildReservationExternalIdContext } from '../reservationSync'
import { classifyICalEvent } from '../icalService'

it.each([
  ['https://app.flatio.com/ical/opaque', 'flatio'],
  ['https://admin.booking.com/calendar/opaque', 'booking'],
  ['https://www.airbnb.com/calendar/opaque', 'airbnb'],
])('resolves %s independently of legacy manual metadata', (url, platform) => {
  expect(normalizeListingPlatform({ name: 'manual' }, url)).toBe(platform)
})

it.each(['https://flatio.com.attacker.test/cal', 'https://example.com/?flatio.com', 'not-a-url'])('does not trust provider names outside the hostname: %s', (url) => {
  expect(normalizeListingPlatform({ name: 'manual' }, url)).toBeNull()
})

it('preserves opaque Flatio identity using the feed origin', () => {
  const event = { uid: 'opaque-123', summary: 'CLOSED', description: '' }
  const context = buildReservationExternalIdContext(event, 'flatio')
  expect(context.source).toBe('flatio')
  expect(context.stableExternalId).toBe('flatio_opaque-123')
  expect(classifyICalEvent({ ...event, sourcePlatform: context.source })).toBe('block')
})
