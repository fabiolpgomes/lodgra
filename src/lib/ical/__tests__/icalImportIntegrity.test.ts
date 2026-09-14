import { importICalFromUrl } from '@/lib/ical/icalService'

const feed = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//Calendar//EN', ...events, 'END:VCALENDAR'].join('\r\n')
const event = (lines: string[] = []) => ['BEGIN:VEVENT', 'UID:stable-event@booking.com',
  'DTSTART;VALUE=DATE:20260916', 'DTEND;VALUE=DATE:20260920', 'SUMMARY:CLOSED - Not available',
  ...lines, 'END:VEVENT'].join('\r\n')
const mockFetch = jest.fn()
const read = async (body: string) => {
  mockFetch.mockResolvedValue({ ok: true, text: async () => body })
  return importICalFromUrl('https://example.com/calendar.ics')
}

describe('iCal feed integrity before cancellation reconciliation', () => {
  beforeEach(() => { global.fetch = mockFetch; jest.clearAllMocks() })

  it('accepts a complete calendar with no events', async () => {
    await expect(read(feed())).resolves.toEqual([])
  })

  it('preserves DATE values in UTC and imports every block', async () => {
    const entries = await read(feed(event(), event().replace('stable-event@booking.com', 'airbnb-block@airbnb.com')
      .replace('CLOSED - Not available', 'Airbnb (Not available)')))
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ uid: 'stable-event@booking.com', summary: 'CLOSED - Not available',
      start: new Date('2026-09-16T00:00:00Z'), end: new Date('2026-09-20T00:00:00Z') })
    expect(entries[1].summary).toBe('Airbnb (Not available)')
  })

  it('preserves a valid UTC date-time', async () => {
    const entry = event().replace('DTSTART;VALUE=DATE:20260916', 'DTSTART:20260916T150000Z')
      .replace('DTEND;VALUE=DATE:20260920', 'DTEND:20260920T100000Z')
    const [parsed] = await read(feed(entry))
    expect(parsed.start.toISOString()).toBe('2026-09-16T15:00:00.000Z')
    expect(parsed.end.toISOString()).toBe('2026-09-20T10:00:00.000Z')
  })

  it.each([
    ['HTML', '<html>Service unavailable</html>'],
    ['truncated calendar', feed(event()).replace('END:VCALENDAR', '')],
    ['truncated event', feed(event().replace('END:VEVENT', ''))],
    ['two calendars', `${feed(event())}\r\n${feed()}`],
  ])('rejects %s', async (_name, body) => {
    await expect(read(body)).rejects.toThrow()
  })

  it.each([
    ['missing UID', event().replace('UID:stable-event@booking.com\r\n', '')],
    ['empty UID', event().replace('UID:stable-event@booking.com', 'UID:')],
    ['missing start', event().replace('DTSTART;VALUE=DATE:20260916\r\n', '')],
    ['missing end', event().replace('DTEND;VALUE=DATE:20260920\r\n', '')],
    ['impossible day', event().replace('20260916', '20260230')],
    ['impossible month', event().replace('20260916', '20261316')],
    ['invalid date-time hour', event().replace('DTSTART;VALUE=DATE:20260916', 'DTSTART:20260916T250000Z')],
    ['reversed dates', event().replace('20260920', '20260915')],
    ['zero length', event().replace('20260920', '20260916')],
    ['duplicate start', event(['DTSTART;VALUE=DATE:20260917'])],
  ])('rejects the entire feed for %s, including previously valid events', async (_name, malformed) => {
    await expect(read(feed(event().replace('stable-event@booking.com', 'valid-first'), malformed))).rejects.toThrow()
  })

  it('rejects duplicate event UIDs rather than overwriting availability', async () => {
    await expect(read(feed(event(), event()))).rejects.toThrow(/Duplicate/)
  })

  it.each(['RRULE:FREQ=DAILY;COUNT=3', 'RDATE;VALUE=DATE:20260923', 'RECURRENCE-ID;VALUE=DATE:20260916'])
  ('rejects unsupported recurrence: %s', async (property) => {
    await expect(read(feed(event([property])))).rejects.toThrow(/Recurring/)
  })

  it('supports folded content without confusing it with component boundaries', async () => {
    const entries = await read(`\uFEFF${feed(event(['DESCRIPTION:Long description', ' folded content']))}\r\n`)
    expect(entries[0].description).toBe('Long descriptionfolded content')
  })
})
