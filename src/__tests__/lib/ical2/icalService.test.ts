import { importICalFromUrl, generateICalFromReservations } from '@/lib/ical/icalService'

// Helper to wrap iCal data in VCALENDAR
function makeICalString(events: string, prodId = '-//Test//Test//EN'): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    events,
    'END:VCALENDAR',
  ].join('\r\n')
}

function makeVEvent({
  uid = 'test-uid-1',
  summary = 'Reserved',
  dtstart = '20260601',
  dtend = '20260605',
}: {
  uid?: string
  summary?: string
  dtstart?: string
  dtend?: string
} = {}): string {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    'END:VEVENT',
  ].join('\r\n')
}

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

function mockFetchOk(body: string) {
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => body,
  } as Response)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('importICalFromUrl()', () => {
  it('parses a valid event and returns correct dates', async () => {
    mockFetchOk(makeICalString(makeVEvent({ dtstart: '20260601', dtend: '20260605' })))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('test-uid-1')
    expect(events[0].summary).toBe('Reserved')
    expect(events[0].start).toEqual(new Date(Date.UTC(2026, 5, 1)))
    expect(events[0].end).toEqual(new Date(Date.UTC(2026, 5, 5)))
  })

  it('throws when response is not valid iCal', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html>error page</html>',
    } as Response)

    await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow(
      /not valid iCal/
    )
  })

  it('throws when fetch fails with non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response)

    await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow(
      /Failed to fetch/
    )
  })

  it('filters out "Not available" blocked events from non-platform feed', async () => {
    const blocked = makeVEvent({ uid: 'blocked-1', summary: 'Not available' })
    const real = makeVEvent({ uid: 'real-1', summary: 'Reserved' })
    mockFetchOk(makeICalString([blocked, real].join('\r\n')))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('real-1')
  })

  it('filters out "Airbnb (Not available)" from Airbnb feed', async () => {
    const blocked = makeVEvent({ uid: 'blocked-airbnb', summary: 'Airbnb (Not available)' })
    const real = makeVEvent({ uid: 'real-airbnb', summary: 'Reserved' })
    mockFetchOk(makeICalString([blocked, real].join('\r\n'), '-//Airbnb//Airbnb//EN'))

    const events = await importICalFromUrl('https://airbnb.com/cal.ics')

    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('real-airbnb')
  })

  it('keeps CLOSED events from Booking.com feed (real reservations)', async () => {
    const closedEvent = makeVEvent({ uid: 'booking-closed', summary: 'CLOSED' })
    mockFetchOk(makeICalString(closedEvent, '-//Booking.com//Booking.com//EN'))

    const events = await importICalFromUrl('https://booking.com/cal.ics')

    expect(events).toHaveLength(1)
    expect(events[0].summary).toBe('CLOSED')
  })

  it('skips events with empty summary in non-platform feeds', async () => {
    const emptyEvent = makeVEvent({ uid: 'empty-1', summary: '' })
    mockFetchOk(makeICalString(emptyEvent))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    expect(events).toHaveLength(0)
  })

  it('returns empty array when calendar has no events', async () => {
    mockFetchOk(makeICalString(''))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    expect(events).toHaveLength(0)
  })

  it('skips events missing DTSTART or DTEND and does not throw', async () => {
    // Event with no date properties — ical.js sets startDate/endDate to null
    const eventWithoutDates = [
      'BEGIN:VEVENT',
      'UID:no-dates-1',
      'SUMMARY:Reserved',
      'END:VEVENT',
    ].join('\r\n')
    mockFetchOk(makeICalString(eventWithoutDates))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    // Should not throw and return empty (event skipped due to missing dates)
    expect(events).toHaveLength(0)
  })
})

describe('generateICalFromReservations()', () => {
  it('generates valid VCALENDAR string', () => {
    const result = generateICalFromReservations([])

    expect(result).toContain('BEGIN:VCALENDAR')
    expect(result).toContain('END:VCALENDAR')
  })

  it('includes reservation event with correct UIDs', () => {
    const reservations = [
      {
        id: 'res-001',
        check_in: '2026-06-01',
        check_out: '2026-06-05',
        status: 'confirmed',
        number_of_guests: 2,
        guests: { first_name: 'João', last_name: 'Silva' },
        property_listings: { properties: { name: 'Casa Alfama' } },
      },
    ]

    const result = generateICalFromReservations(reservations)

    expect(result).toContain('BEGIN:VEVENT')
    expect(result).toContain('reservation-res-001@homestay.com')
    expect(result).toContain('João Silva - Casa Alfama')
  })

  it('skips reservations with missing dates', () => {
    const reservations = [
      {
        id: 'res-bad',
        check_in: '',
        check_out: '',
        status: 'confirmed',
      },
    ]

    const result = generateICalFromReservations(reservations)

    expect(result).not.toContain('BEGIN:VEVENT')
  })
})
