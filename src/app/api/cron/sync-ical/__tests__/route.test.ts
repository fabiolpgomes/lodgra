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
import { importPendingICalReservation } from '@/lib/ical/pendingReservation'
import { enqueueEmail } from '@/lib/email/queue'
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

jest.mock('@/lib/ical/pendingReservation', () => ({
  importPendingICalReservation: jest.fn(),
}))

/**
 * Builds a thenable "query builder" stub that mimics the chainable Supabase
 * PostgREST client (select().eq().eq().not() etc.), resolving to `result`
 * regardless of which chain of methods was called.
 */
function makeQuery(result: unknown) {
  const query: Record<string, unknown> = {
    select: jest.fn(() => query),
    retry: jest.fn(() => query),
    abortSignal: jest.fn(() => query),
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
    ;(importPendingICalReservation as jest.Mock).mockResolvedValue({
      reservation_id: 'pending-reservation', calendar_event_id: 'event-audit', created: false, action: 'updated',
    })
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

  describe('initial listings read recovery', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it.each([502, 503, 504, 520])('recovers HTTP %s without repeating a sync', async (status) => {
      const select = jest.fn()
        .mockReturnValueOnce(makeQuery({ data: null, error: { message: 'Gateway Timeout' }, status }))
        .mockReturnValueOnce(makeQuery({ data: [], error: null, status: 200 }))
      const from = jest.fn(() => ({ select }))
      ;(createAdminClient as jest.Mock).mockReturnValue({ from })
      const responsePromise = GET(buildRequest())
      await jest.runAllTimersAsync()
      expect((await responsePromise).status).toBe(200)
      expect(select).toHaveBeenCalledTimes(2)
      expect(from.mock.calls).toEqual([['property_listings'], ['property_listings']])
      expect(importICalFromUrl).not.toHaveBeenCalled()
    })

    it('stops after three reads and reports the final upstream error', async () => {
      const query = makeQuery({ data: null, error: { message: 'Gateway Timeout' }, status: 504 })
      const select = jest.fn(() => query)
      ;(createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => ({ select })) })
      const responsePromise = GET(buildRequest())
      await jest.runAllTimersAsync()
      const response = await responsePromise
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Gateway Timeout' })
      expect(select).toHaveBeenCalledTimes(3)
      expect(query.retry).toHaveBeenCalledWith(false)
      expect(importICalFromUrl).not.toHaveBeenCalled()
    })

    it('aborts a stalled initial read after ten seconds without retrying or writing', async () => {
      let signal: AbortSignal
      const query = makeQuery(null)
      ;(query.abortSignal as jest.Mock).mockImplementation((value: AbortSignal) => {
        signal = value
        return query
      })
      query.then = (resolve: (value: unknown) => unknown) => new Promise(done => {
        signal.addEventListener('abort', () => done({ data: null, error: { message: 'Read aborted' }, status: 0 }))
      }).then(resolve)
      const select = jest.fn(() => query)
      ;(createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => ({ select })) })
      const responsePromise = GET(buildRequest())
      await jest.advanceTimersByTimeAsync(10_000)
      const response = await responsePromise
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Read aborted' })
      expect(select).toHaveBeenCalledTimes(1)
      expect(importICalFromUrl).not.toHaveBeenCalled()
      expect(jest.getTimerCount()).toBe(0)
    })

    it.each([0, 400, 401, 403, 409, 500])('does not retry non-transient HTTP %s', async (status) => {
      const select = jest.fn(() => makeQuery({ data: null, error: { message: 'Read rejected' }, status }))
      ;(createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => ({ select })) })
      expect((await GET(buildRequest())).status).toBe(500)
      expect(select).toHaveBeenCalledTimes(1)
      expect(importICalFromUrl).not.toHaveBeenCalled()
    })
  })

  it('preserva identidade, ocupação e valores manuais ao atualizar reserva Booking existente', async () => {
    const listing = {
      id: 'listing-manual', property_id: 'property-manual', sync_enabled: true,
      ical_url: 'https://example.com/manual.ics', platforms: { name: 'Booking.com' },
      properties: { name: 'Manual', organization_id: 'org-manual', is_active: true },
    }
    const reservationPayloads: Record<string, unknown>[] = []
    const reservationUpdate = jest.fn((payload: Record<string, unknown>) => {
      reservationPayloads.push(payload)
      return makeQuery({ data: null, error: null })
    })
    const supabase = { from: jest.fn((table: string) => {
      if (table === 'property_listings') return {
        select: jest.fn(() => makeQuery({ data: [listing], error: null })),
        update: jest.fn(() => makeQuery({ data: null, error: null })),
      }
      if (table === 'reservations') return {
        select: jest.fn(() => makeQuery({
          data: [{ id: 'existing-manual', external_id: 'booking_12345', calendar_event_id: 'event-audit' }],
          error: null,
        })),
        update: reservationUpdate,
      }
      if (table === 'sync_logs') return { insert: jest.fn(() => makeQuery({ data: null, error: null })) }
      return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
    }) }
    ;(createAdminClient as jest.Mock).mockReturnValue(supabase)
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 1)
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 3)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: '12345@booking.com', summary: 'Reserved', description: 'Reservation number: 12345\nNumber of guests: 7', start, end,
    }])
    const response = await GET(buildRequest())
    expect((await response.json()).updated).toBe(1)
    expect(reservationUpdate).not.toHaveBeenCalled()
    expect(reservationPayloads).toEqual([])
    expect(importPendingICalReservation).toHaveBeenCalledWith(supabase, 'org-manual', 'event-audit', expect.any(Array))
    expect(supabase.from).not.toHaveBeenCalledWith('guests')
    expect(enqueueEmail).not.toHaveBeenCalled()
  })

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
    ...[true, false].flatMap(pilotEnabled => ['empty', 'created', 'updated', 'blocked', 'ignored', 'error'].map(action => ({ action, auditStatus: 'unmatched', pilotEnabled, long: false }))),
    { action: 'created', auditStatus: 'unmatched', pilotEnabled: false, long: true },
    { action: 'updated', auditStatus: 'matched', pilotEnabled: false, long: false },
    { action: 'ignored', auditStatus: 'ignored', pilotEnabled: false, long: false },
  ])(
    'registra resultado pendente $action (audit=$auditStatus, pilot=$pilotEnabled, long=$long) sem escrever reserva diretamente ou enviar email', async ({ action, auditStatus, pilotEnabled, long }) => {
    ;(upsertCalendarEventAudit as jest.Mock).mockResolvedValue({ id: 'event-audit', status: auditStatus })
    const result = { reservation_id: 'pending-reservation', calendar_event_id: 'event-audit', created: action === 'created', action }
    if (action === 'error') {
      ;(importPendingICalReservation as jest.Mock).mockRejectedValue(new Error('Falha ao incluir reserva pendente: RPC indisponível'))
    } else {
      ;(importPendingICalReservation as jest.Mock).mockResolvedValue(result)
    }
    const listing = {
      id: 'listing-booking', ical_url: 'https://example.com/booking.ics', sync_enabled: pilotEnabled,
      property_id: 'property-booking',
      properties: { name: 'AHS Premium Apart', organization_id: 'org-1', is_active: true },
    }
    const syncLogInsert = jest.fn(() => Promise.resolve({ data: null, error: null }))
    const reservationTable = {
      select: jest.fn(() => makeQuery({ data: [{ id: 'pending-reservation', external_id: 'different-booking-code', calendar_event_id: 'event-audit', check_out: '2026-09-20' }], error: null })),
      insert: jest.fn(), update: jest.fn(() => makeQuery({ data: [{ id: 'pending-reservation' }], error: null })),
    }
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') return {
          select: jest.fn(() => makeQuery({ data: [listing], error: null })),
          update: jest.fn(() => makeQuery({ data: null, error: null })),
        }
        if (table === 'reservations') return reservationTable
        if (table === 'calendar_blocks') return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
        if (table === 'sync_logs') return { insert: syncLogInsert }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }
    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: pilotEnabled, pilot_platforms: ['booking'] })
    ;(classifyICalEvent as jest.Mock).mockReturnValue('block')
    const start = new Date(); start.setUTCDate(start.getUTCDate() + 1)
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + (long ? 240 : 1))
    ;(importICalFromUrl as jest.Mock).mockResolvedValue(action === 'empty' ? [] : [{
      uid: 'e4729bf0c6e6e224ac8f9bbd06eb89d3@booking.com',
      summary: 'CLOSED - Not available', description: '', start, end,
    }])

    const response = await GET(buildRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    if (action === 'empty') expect(importPendingICalReservation).not.toHaveBeenCalled()
    else expect(importPendingICalReservation).toHaveBeenCalledWith(mockSupabase, 'org-1', 'event-audit', expect.any(Array))
    expect(enqueueEmail).not.toHaveBeenCalled()
    if (action === 'error') expect(reservationTable.select).not.toHaveBeenCalled()
    else expect(reservationTable.select).toHaveBeenCalled()
    expect(reservationTable.insert).not.toHaveBeenCalled()
    if (action === 'empty') {
      expect(body.cancelled).toBe(1)
      expect(reservationTable.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    } else expect(reservationTable.update).not.toHaveBeenCalled()
    if (action === 'error') {
      expect(body.errors).toBe(1)
      expect(syncLogInsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed', error_message: 'Falha ao incluir reserva pendente: RPC indisponível',
      }))
    } else {
      expect(body).toMatchObject({
        created: action === 'created' ? 1 : 0,
        updated: action === 'updated' ? 1 : 0,
        blocked: action === 'blocked' ? 1 : 0,
        skipped: action === 'ignored' ? 1 : 0,
      })
      expect(syncLogInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
      if (action === 'created') {
        ;(importPendingICalReservation as jest.Mock).mockResolvedValue({ ...result, created: false, action: 'updated' })
        const repeated = await GET(buildRequest())
        expect(await repeated.json()).toMatchObject({ created: 0, updated: 1 })
        expect(reservationTable.insert).not.toHaveBeenCalled()
        expect(enqueueEmail).not.toHaveBeenCalled()
      }
    }
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
            ? { data: [{ id: 'existing-reservation', calendar_event_id: 'event-audit' }], error: null }
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
      start: new Date('2026-09-16T00:00:00.000Z'),
      end: new Date('2026-09-20T00:00:00.000Z'),
    }])
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    expect(reservationTable.select).toHaveBeenCalled()
  })

  it.each([true, false])('contabiliza cancelamento ausente somente quando CAS vence (%s)', async casWon => {
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
    const reservationUpdate = jest.fn(() => makeQuery({ data: casWon ? [{ id: 'reservation-cancel' }] : [], error: null }))

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
    expect(body.cancelled).toBe(casWon ? 1 : 0)
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
    const reservationUpdate = jest.fn(() => makeQuery({ data: [{ id: 'reservation-airbnb' }], error: null }))

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
  it.each(['cancel-read', 'cancel-write', 'block-delete', 'last-synced', 'success-log'])('marca listing failed quando a limpeza falha em %s', async failure => {
    const listing = {
      id: 'listing-cleanup', property_id: 'property-cleanup', sync_enabled: true,
      ical_url: 'https://example.com/empty.ics',
      properties: { id: 'property-cleanup', name: 'Casa', organization_id: 'org-cleanup', is_active: true },
    }
    const syncLogInsert = jest.fn((payload: { status: string }) => Promise.resolve({ data: null, error: failure === 'success-log' && payload.status === 'success' ? { message: 'cleanup unavailable' } : null }))
    const reservationUpdate = jest.fn(() => makeQuery({ data: null, error: { message: 'cleanup unavailable' } }))
    const blockDelete = jest.fn(() => makeQuery({ data: null, error: { message: 'cleanup unavailable' } }))
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') return {
          select: jest.fn(() => makeQuery({ data: [listing], error: null })),
          update: jest.fn(() => makeQuery({ data: null, error: failure === 'last-synced' ? { message: 'cleanup unavailable' } : null })),
        }
        if (table === 'reservations') return {
          select: jest.fn(() => makeQuery({
            data: failure === 'cancel-write' ? [{ id: 'reservation-cleanup', external_id: 'missing-code', check_out: '2026-09-20' }] : [],
            error: failure === 'cancel-read' ? { message: 'cleanup unavailable' } : null,
          })), update: reservationUpdate,
        }
        if (table === 'calendar_blocks') return {
          select: jest.fn(() => makeQuery({ data: failure === 'block-delete' ? [{ id: 'block-cleanup', external_uid: 'missing-uid' }] : [], error: null })),
          delete: blockDelete,
        }
        if (table === 'sync_logs') return { insert: syncLogInsert }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }
    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: true, pilot_platforms: ['booking'] })
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])
    const response = await GET(buildRequest())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.errors).toBe(1)
    expect(syncLogInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error_message: expect.stringContaining('cleanup unavailable') }))
    expect(enqueueEmail).not.toHaveBeenCalled()
    if (failure === 'cancel-read') expect(reservationUpdate).not.toHaveBeenCalled()
    if (failure !== 'block-delete') expect(blockDelete).not.toHaveBeenCalled()
  })

})
