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

  it('imports ALL events without filtering (caller decides via isBlockedEvent)', async () => {
    // NOTE: importICalFromUrl does NOT filter blocks/reservations.
    // The cron job uses isBlockedEvent() to decide what to do with each event.
    const blocked = makeVEvent({ uid: 'blocked-1', summary: 'Not available' })
    const real = makeVEvent({ uid: 'real-1', summary: 'Reserved' })
    mockFetchOk(makeICalString([blocked, real].join('\r\n')))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    // BOTH events imported (filtering happens in sync-ical/route.ts via isBlockedEvent)
    expect(events).toHaveLength(2)
    expect(events[0].uid).toBe('blocked-1')
    expect(events[1].uid).toBe('real-1')
  })

  it('imports Airbnb events without filtering', async () => {
    const blocked = makeVEvent({ uid: 'blocked-airbnb', summary: 'Airbnb (Not available)' })
    const real = makeVEvent({ uid: 'real-airbnb', summary: 'Reserved' })
    mockFetchOk(makeICalString([blocked, real].join('\r\n'), '-//Airbnb//Airbnb//EN'))

    const events = await importICalFromUrl('https://airbnb.com/cal.ics')

    // BOTH events imported (filtering happens in sync-ical via isBlockedEvent)
    expect(events).toHaveLength(2)
    expect(events.map(e => e.uid).sort()).toEqual(['blocked-airbnb', 'real-airbnb'])
  })

  it('imports Booking.com CLOSED events without filtering', async () => {
    // Booking.com sends both reservations and blocks with CLOSED summary.
    // importICalFromUrl imports both; cron job uses isBlockedEvent() to differentiate.
    const closedEvent = makeVEvent({ uid: 'booking-closed', summary: 'CLOSED' })
    mockFetchOk(makeICalString(closedEvent, '-//Booking.com//Booking.com//EN'))

    const events = await importICalFromUrl('https://booking.com/cal.ics')

    // Event imported (filtering happens in sync-ical via isBlockedEvent)
    expect(events).toHaveLength(1)
    expect(events[0].uid).toBe('booking-closed')
  })

  it('rejects the entire feed when any event has missing dates', async () => {
    // Only events without dates are skipped (can't process them)
    const emptyDateEvent = [
      'BEGIN:VEVENT',
      'UID:empty-dates',
      'SUMMARY:any-summary',
      'END:VEVENT',
    ].join('\r\n')
    const validEvent = makeVEvent({ uid: 'valid', summary: 'anything' })
    mockFetchOk(makeICalString([emptyDateEvent, validEvent].join('\r\n')))

    await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow('dates are missing')
  })

  it('returns empty array when calendar has no events', async () => {
    mockFetchOk(makeICalString(''))

    const events = await importICalFromUrl('https://example.com/cal.ics')

    expect(events).toHaveLength(0)
  })

  it('rejects a feed containing only malformed events', async () => {
    // Event with no date properties — ical.js sets startDate/endDate to null
    const eventWithoutDates = [
      'BEGIN:VEVENT',
      'UID:no-dates-1',
      'SUMMARY:Reserved',
      'END:VEVENT',
    ].join('\r\n')
    mockFetchOk(makeICalString(eventWithoutDates))

    await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow('dates are missing')
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
    expect(result).toContain('reservation-res-001@lodgra.com')
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

it('rejects an event without stable UID rather than generating a new identity each poll', async () => {
  mockFetchOk(makeICalString(makeVEvent().replace('UID:test-uid-1\r\n', '')))
  await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow('UID is missing')
})

it('rejects duplicate event identities instead of arbitrarily overwriting dates', async () => {
  mockFetchOk(makeICalString([makeVEvent(), makeVEvent({ dtend: '20260610' })].join('\r\n')))
  await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow('duplicate UID')
})

it('retains explicit CANCELLED status for the reconciliation lifecycle', async () => {
  mockFetchOk(makeICalString(makeVEvent().replace('END:VEVENT', 'STATUS:CANCELLED\r\nEND:VEVENT')))
  expect((await importICalFromUrl('https://example.com/cal.ics'))[0].status).toBe('CANCELLED')
})

it('rejects invalid stay order before any caller can treat the feed as complete', async () => {
  mockFetchOk(makeICalString(makeVEvent({ dtstart: '20260605', dtend: '20260601' })))
  await expect(importICalFromUrl('https://example.com/cal.ics')).rejects.toThrow('checkout must follow checkin')
})

describe('importICalFromUrl(): eventos com hora', () => {
  const timed = (dtstart: string, dtend: string) => [
    'BEGIN:VEVENT', 'UID:timed-1', 'SUMMARY:Reserva', `DTSTART${dtstart}`, `DTEND${dtend}`, 'END:VEVENT',
  ].join('\r\n')

  it('um evento com hora fica no dia indicado pelo feed, não no dia UTC (22:00 em São Paulo)', async () => {
    mockFetchOk(makeICalString(timed(';TZID=America/Sao_Paulo:20260601T220000', ';TZID=America/Sao_Paulo:20260605T100000')))
    const events = await importICalFromUrl('https://example.com/feed.ics')
    expect(events[0].start.toISOString().slice(0, 10)).toBe('2026-06-01')
    expect(events[0].end.toISOString().slice(0, 10)).toBe('2026-06-05')
  })

  it('um evento flutuante ou em UTC mantém os componentes do feed', async () => {
    mockFetchOk(makeICalString(timed(':20260601T000000', ':20260605T100000')))
    const events = await importICalFromUrl('https://example.com/feed.ics')
    expect(events[0].start.toISOString().slice(0, 10)).toBe('2026-06-01')
  })
})
