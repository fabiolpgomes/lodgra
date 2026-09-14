/**
 * Tests for GET /api/cron/sync-ical
 *
 * Story 39.5: garante que o fluxo de sync inbound (iCal) registra o resultado
 * (sucesso ou falha) na tabela sync_logs, dado que o dashboard passou a exibir
 * um indicador de status baseado nessa tabela.
 */

import { GET } from '@/app/api/cron/sync-ical/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, classifyICalEvent } from '@/lib/ical/icalService'
import { getFeatureFlagStatus } from '@/lib/email-reconciliation/feature-flag'
import { hasActiveReconciledReservation, upsertReconciliationAvailability } from '@/lib/ical/reconciliationAvailability'
import { upsertCalendarEventAudit } from '@/lib/ical/calendarEventAudit'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/ical/icalService', () => ({
  importICalFromUrl: jest.fn(),
  classifyICalEvent: jest.fn(() => 'unknown'),
}))

jest.mock('@/lib/email/queue', () => ({
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/ical/calendarEventAudit', () => ({
  upsertCalendarEventAudit: jest.fn().mockResolvedValue({ id: 'event-audit', status: 'unmatched' }),
}))

jest.mock('@/lib/email-reconciliation/feature-flag', () => ({
  getFeatureFlagStatus: jest.fn().mockResolvedValue({ enabled: false, pilot_platforms: [] }),
}))

jest.mock('@/lib/ical/reconciliationAvailability', () => ({
  upsertReconciliationAvailability: jest.fn().mockResolvedValue(undefined),
  hasActiveReconciledReservation: jest.fn().mockResolvedValue(true),
}))

/**
 * Builds a thenable "query builder" stub that mimics the chainable Supabase
 * PostgREST client (select().eq().eq().not() etc.), resolving to `result`
 * regardless of which chain of methods was called.
 */
function makeQuery(result: unknown) {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    is: jest.fn(() => query),
    in: jest.fn(() => query),
    not: jest.fn(() => query),
    neq: jest.fn(() => query),
    lt: jest.fn(() => query),
    gt: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    update: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  return query
}

const CRON_SECRET = 'test-cron-secret'

describe('GET /api/cron/sync-ical', () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    ;(hasActiveReconciledReservation as jest.Mock).mockResolvedValue(true)
    ;(upsertCalendarEventAudit as jest.Mock).mockResolvedValue({ id: 'event-audit', status: 'unmatched' })
    ;(classifyICalEvent as jest.Mock).mockReturnValue('unknown')
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: false, pilot_platforms: [] })
    process.env.CRON_SECRET = CRON_SECRET
  })

  afterAll(() => {
    process.env.CRON_SECRET = originalCronSecret
  })

  function buildRequest() {
    return createTestRequest('http://localhost/api/cron/sync-ical', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    })
  }

  it('registra sync_logs com status "success" quando o listing sincroniza sem erros', async () => {
    const listing = {
      id: 'listing-1',
      ical_url: 'https://example.com/cal.ics',
      sync_enabled: true,
      property_id: 'prop-1',
      properties: { name: 'Casa Azul', organization_id: 'org-1', is_active: true },
    }

    const insertedSyncLogs: Array<Record<string, unknown>> = []

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_blocks') {
          return {
            select: jest.fn(() => makeQuery({ data: [], error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'sync_logs') {
          return {
            insert: jest.fn((payload: Record<string, unknown>) => {
              insertedSyncLogs.push(payload)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.errors).toBe(0)

    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      property_listing_id: 'listing-1',
      sync_type: 'ical',
      direction: 'inbound',
      status: 'success',
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
    })
    expect(insertedSyncLogs[0].synced_at).toEqual(expect.any(String))
  })

  it('registra sync_logs com status "failed" e error_message preenchido quando o listing falha', async () => {
    const listing = {
      id: 'listing-2',
      ical_url: 'https://example.com/broken.ics',
      sync_enabled: true,
      property_id: 'prop-2',
      properties: { name: 'Casa Verde', organization_id: 'org-1', is_active: true },
    }

    const insertedSyncLogs: Array<Record<string, unknown>> = []

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'sync_logs') {
          return {
            insert: jest.fn((payload: Record<string, unknown>) => {
              insertedSyncLogs.push(payload)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockRejectedValue(new Error('Timeout ao buscar iCal'))

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.errors).toBe(1)

    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      property_listing_id: 'listing-2',
      sync_type: 'ical',
      direction: 'inbound',
      status: 'failed',
      error_message: 'Timeout ao buscar iCal',
      records_processed: 0,
      records_created: 0,
      records_updated: 0,
      records_failed: 1,
    })
  })

  it('adota bloqueio legado sem listing e o conta como registro processado', async () => {
    const listing = {
      id: 'listing-block',
      ical_url: 'https://example.com/blocked.ics',
      sync_enabled: true,
      property_id: 'prop-block',
      properties: { name: 'Casa Bloqueada', organization_id: 'org-1', is_active: true },
    }
    const insertedSyncLogs: Array<Record<string, unknown>> = []
    let calendarBlockSelectCount = 0
    const calendarBlockUpdate = jest.fn(() => makeQuery({ data: null, error: null }))

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_blocks') {
          return {
            select: jest.fn(() => {
              calendarBlockSelectCount++
              if (calendarBlockSelectCount === 1) {
                return makeQuery({ data: null, error: null })
              }
              if (calendarBlockSelectCount === 2) {
                return makeQuery({ data: { id: 'block-legacy', property_listing_id: null }, error: null })
              }
              return makeQuery({ data: [], error: null })
            }),
            update: calendarBlockUpdate,
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'sync_logs') {
          return {
            insert: jest.fn((payload: Record<string, unknown>) => {
              insertedSyncLogs.push(payload)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(classifyICalEvent as jest.Mock).mockReturnValue('block')
    const start = new Date()
    start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 2)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'blocked-uid',
      summary: 'Not available',
      description: '',
      start,
      end,
    }])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.blocked).toBe(1)
    expect(calendarBlockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      property_listing_id: listing.id,
    }))
    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      status: 'success',
      records_processed: 1,
      records_created: 0,
      records_updated: 0,
      records_failed: 0,
    })
  })

  it('retorna 401 quando o Authorization header não corresponde ao CRON_SECRET', async () => {
    const request = createTestRequest('http://localhost/api/cron/sync-ical', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it.each([
    { status: 'unmatched', covered: false },
    { status: 'matched', covered: true },
    { status: 'matched', covered: false },
  ])('preserva disponibilidade para $status, cobertura ativa=$covered', async ({ status, covered }) => {
    ;(hasActiveReconciledReservation as jest.Mock).mockResolvedValue(covered)
    ;(upsertCalendarEventAudit as jest.Mock).mockResolvedValue({ id: 'event-audit', status })
    const listing = {
      id: 'listing-booking', ical_url: 'https://example.com/booking.ics', sync_enabled: true,
      property_id: 'property-booking',
      properties: { name: 'AHS Premium Apart', organization_id: 'org-1', is_active: true },
    }
    const reservationTable = { select: jest.fn(), insert: jest.fn(), update: jest.fn() }
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') return {
          select: jest.fn(() => makeQuery({ data: [listing], error: null })),
          update: jest.fn(() => makeQuery({ data: null, error: null })),
        }
        if (table === 'reservations') return reservationTable
        if (table === 'calendar_blocks') return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
        if (table === 'sync_logs') return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }
    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: true, pilot_platforms: ['booking'] })
    ;(classifyICalEvent as jest.Mock).mockReturnValue('block')
    const start = new Date('2026-09-29T00:00:00.000Z')
    const end = new Date('2026-09-30T00:00:00.000Z')
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'e4729bf0c6e6e224ac8f9bbd06eb89d3@booking.com',
      summary: 'CLOSED - Not available', description: '', start, end,
    }])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.blocked).toBe(status === 'matched' && covered ? 0 : 1)
    if (status === 'matched' && covered) {
      expect(upsertReconciliationAvailability).not.toHaveBeenCalled()
      expect(body.skipped).toBe(1)
      // Repeating the sync must not restore the consumed provisional block.
      await GET(buildRequest())
      expect(upsertReconciliationAvailability).not.toHaveBeenCalled()
    } else {
      expect(upsertReconciliationAvailability).toHaveBeenCalledWith(expect.objectContaining({
        propertyListingId: 'listing-booking', checkIn: '2026-09-29', checkOut: '2026-09-30',
      }))
    }
    expect(reservationTable.select).not.toHaveBeenCalled()
    expect(reservationTable.insert).not.toHaveBeenCalled()
  })

  it('delimita a procura de reserva existente pelo listing e organização', async () => {
    const listing = {
      id: 'listing-tenant-safe',
      ical_url: 'https://example.com/tenant-safe.ics',
      sync_enabled: true,
      property_id: 'prop-tenant-safe',
      properties: { name: 'Casa Segura', organization_id: 'org-tenant-safe', is_active: true },
    }
    let reservationSelectCall = 0
    const reservationTable = {
      select: jest.fn(() => {
        reservationSelectCall++
        return makeQuery(
          reservationSelectCall === 1
            ? { data: { id: 'existing-reservation' }, error: null }
            : { data: [], error: null }
        )
      }),
      update: jest.fn(() => makeQuery({ data: null, error: null })),
    }

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'reservations') return reservationTable
        if (table === 'calendar_blocks') {
          return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
        }
        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'shared-platform-uid',
      summary: 'Reserved',
      description: '',
      start: new Date('2026-09-10T00:00:00.000Z'),
      end: new Date('2026-09-12T00:00:00.000Z'),
    }])
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    expect(reservationTable.select).toHaveBeenCalled()
  })

  it('cancela reservas futuras que desapareceram do feed iCal', async () => {
    const listing = {
      id: 'listing-cancel',
      ical_url: 'https://example.com/cancel.ics',
      sync_enabled: true,
      property_id: 'prop-cancel',
      properties: { name: 'Casa Cancel', organization_id: 'org-cancel', is_active: true },
    }

    const existingReservationQuery = makeQuery({
      data: [{ id: 'reservation-cancel', external_id: 'booking_777', check_out: '2026-09-20' }],
      error: null,
    })
    const reservationUpdate = jest.fn(() => makeQuery({ data: { id: 'reservation-cancel' }, error: null }))

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'reservations') {
          return {
            select: jest.fn(() => existingReservationQuery),
            update: reservationUpdate,
          }
        }
        if (table === 'calendar_blocks') {
          return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
        }
        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.cancelled).toBe(1)
    expect(reservationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      cancelled_at: expect.any(String),
      updated_at: expect.any(String),
    }))
  })

  it('preserva cancelamento para listing fora do piloto quando a flag da organização está ativa', async () => {
    const listing = {
      id: 'listing-airbnb-non-pilot',
      ical_url: 'https://example.com/airbnb-empty.ics',
      sync_enabled: true,
      property_id: 'prop-airbnb',
      platforms: { name: 'Airbnb', display_name: 'Airbnb' },
      properties: { name: 'Casa Airbnb', organization_id: 'org-mixed', is_active: true },
    }
    const reservationUpdate = jest.fn(() => makeQuery({ data: { id: 'reservation-airbnb' }, error: null }))

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'reservations') {
          return {
            select: jest.fn(() => makeQuery({
              data: [{ id: 'reservation-airbnb', external_id: 'airbnb_777', check_out: '2026-09-20' }],
              error: null,
            })),
            update: reservationUpdate,
          }
        }
        if (table === 'calendar_blocks') {
          return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
        }
        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({
      enabled: true,
      pilot_platforms: ['booking'],
    })

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    expect(reservationUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
  })

  it('limita a limpeza de bloqueios ao listing que está sendo sincronizado', async () => {
    const listing = {
      id: 'listing-block-owner',
      ical_url: 'https://example.com/empty.ics',
      sync_enabled: true,
      property_id: 'property-shared',
      properties: { name: 'Casa Multi-OTA', organization_id: 'org-1', is_active: true },
    }
    const blockCleanupQuery = makeQuery({ data: [], error: null })

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_blocks') {
          return { select: jest.fn(() => blockCleanupQuery) }
        }
        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    expect(blockCleanupQuery.eq).toHaveBeenCalledWith('property_id', 'property-shared')
    expect(blockCleanupQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(blockCleanupQuery.eq).toHaveBeenCalledWith('property_listing_id', 'listing-block-owner')
  })

  it('falha o listing sem criar hóspede quando a consulta da reserva existente falha', async () => {
    const listing = {
      id: 'listing-fail-closed',
      ical_url: 'https://example.com/reservation.ics',
      sync_enabled: true,
      property_id: 'property-1',
      properties: { name: 'Casa Segura', organization_id: 'org-1', is_active: true },
    }
    const guestInsert = jest.fn()

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return { upsert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        if (table === 'reservations') {
          return {
            select: jest.fn(() => makeQuery({
              data: null,
              error: { message: 'Gateway Timeout' },
            })),
          }
        }
        if (table === 'guests') return { insert: guestInsert }
        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'airbnb-reservation-1@airbnb.com',
      summary: 'Reserved',
      description: '',
      start: new Date('2026-09-20T00:00:00.000Z'),
      end: new Date('2026-09-22T00:00:00.000Z'),
    }])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.errors).toBe(1)
    expect(guestInsert).not.toHaveBeenCalled()
  })
})
