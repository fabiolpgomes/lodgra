import { createAdminClient } from '@/lib/supabase/admin'
import { syncExtractedDataToReservation } from '../sync-to-reservations'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

function query(result: unknown) {
  const builder: Record<string, unknown> = {
    select: jest.fn(() => builder), eq: jest.fn(() => builder), gte: jest.fn(() => builder),
    lte: jest.fn(() => builder), order: jest.fn(() => builder), limit: jest.fn(() => builder),
    update: jest.fn(() => builder), single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  }
  return builder
}

const extraction = {
  id: 'ext-1', organization_id: 'org-1', raw_email_id: 'raw-1', source_platform: 'booking',
  guest_name: 'Nuno Correia', guest_count: 3, check_in: '2026-09-29', check_out: '2026-09-30',
  total_value: 162.09, currency: 'EUR', reservation_code: '5762083928',
  property_identifier_raw: 'AHS Premium Apart 2 Pools PS4 5 min Beach Algarve', confidence: 0.98,
  match_status: 'pending', matched_event_id: null,
}

const opaqueBookingEvent = {
  id: 'event-1', organization_id: 'org-1', source_platform: 'booking',
  check_in: '2026-09-29', check_out: '2026-09-30', raw_summary: 'CLOSED - Not available',
  status: 'unmatched', created_at: '2026-09-10T20:00:00Z',
  properties: { name: 'AHS Premium Apart 2 Pools PS4 5 min Beach Algarve' },
}

describe('syncExtractedDataToReservation', () => {
  beforeEach(() => jest.clearAllMocks())

  function setup(extractionRow: Record<string, unknown> | null, events: Record<string, unknown>[]) {
    const extractionQuery = query({ data: extractionRow, error: extractionRow ? null : { message: 'Not found' } })
    const eventsQuery = query({ data: events, error: null })
    const reservationsQuery = query({ data: null, error: null })
    const rpc = jest.fn().mockResolvedValue({ data: { reservation_id: 'reservation-1', created: true }, error: null })
    const client = {
      rpc,
      from: jest.fn((table: string) => {
        if (table === 'email_extractions') return extractionQuery
        if (table === 'calendar_events') return eventsQuery
        if (table === 'reservations') return reservationsQuery
        throw new Error(`Unexpected table ${table}`)
      }),
    }
    ;(createAdminClient as jest.Mock).mockResolvedValue(client)
    return { client, rpc, extractionQuery }
  }

  it('creates the atomic reconciliation for an opaque Booking event with exact identity', async () => {
    const { rpc } = setup(extraction, [opaqueBookingEvent])
    const result = await syncExtractedDataToReservation('ext-1')

    expect(result).toEqual({ success: true, status: 'auto_matched', reservationId: 'reservation-1' })
    expect(rpc).toHaveBeenCalledWith('reconcile_email_extraction', {
      p_extraction_id: 'ext-1', p_event_id: 'event-1', p_confirmed_by_host: false,
    })
  })

  it('does not guess when two opaque events have the same score', async () => {
    const { rpc, extractionQuery } = setup(extraction, [
      opaqueBookingEvent,
      { ...opaqueBookingEvent, id: 'event-2', properties: { name: 'AHS Premium Apart 2 Pools PS4 5 min Beach Algarve' } },
    ])
    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.status).toBe('needs_review')
    expect(rpc).not.toHaveBeenCalled()
    expect(extractionQuery.update).toHaveBeenCalledWith(expect.objectContaining({ match_status: 'needs_review' }))
  })

  it('marks no_match when no calendar event exists', async () => {
    setup(extraction, [])
    const result = await syncExtractedDataToReservation('ext-1')
    expect(result).toEqual({ success: true, status: 'no_match' })
  })

  it('routes incomplete extraction to review', async () => {
    const { rpc } = setup({ ...extraction, guest_name: null }, [])
    const result = await syncExtractedDataToReservation('ext-1')
    expect(result.status).toBe('needs_review')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('is idempotent after a completed match', async () => {
    const { client, rpc } = setup({ ...extraction, match_status: 'auto_matched', matched_event_id: 'event-1' }, [])
    ;(client.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'email_extractions') return query({ data: { ...extraction, match_status: 'auto_matched', matched_event_id: 'event-1' }, error: null })
      if (table === 'reservations') return query({ data: { id: 'reservation-1' }, error: null })
      throw new Error(`Unexpected table ${table}`)
    })
    const result = await syncExtractedDataToReservation('ext-1')
    expect(result).toEqual({ success: true, status: 'auto_matched', reservationId: 'reservation-1' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('fails closed when extraction does not exist', async () => {
    setup(null, [])
    const result = await syncExtractedDataToReservation('missing')
    expect(result.success).toBe(false)
  })
})
