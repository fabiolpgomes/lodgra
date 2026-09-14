/**
 * Tests for POST /api/sync/import
 *
 * Story 39.5: garante que o fluxo de sync inbound (iCal) registra o resultado
 * (sucesso ou falha) na tabela sync_logs, dado que o dashboard passou a exibir
 * um indicador de status baseado nessa tabela.
 */

import { POST } from '@/app/api/sync/import/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, classifyICalEvent } from '@/lib/ical/icalService'
import { requireRole } from '@/lib/auth/requireRole'
import { getFeatureFlagStatus } from '@/lib/email-reconciliation/feature-flag'
import { upsertCalendarEventAudit } from '@/lib/ical/calendarEventAudit'
import { importPendingICalReservation } from '@/lib/ical/pendingReservation'
import { enqueueEmail } from '@/lib/email/queue'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/ical/icalService', () => ({
  importICalFromUrl: jest.fn(),
  classifyICalEvent: jest.fn(() => 'unknown'),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => ({
    authorized: true,
    response: null,
  })),
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
 * Thenable query-builder stub that mimics the chainable Supabase PostgREST
 * client (select().eq().not().in() etc.), resolving to `result` regardless
 * of which chain of methods was called.
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
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }
  return query
}

describe('POST /api/sync/import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(importPendingICalReservation as jest.Mock).mockResolvedValue({
      reservation_id: 'pending-reservation', calendar_event_id: 'event-audit', created: false, action: 'updated',
    })
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: false, pilot_platforms: [] })
    ;(upsertCalendarEventAudit as jest.Mock).mockResolvedValue({ id: 'event-audit', status: 'unmatched' })
    // Keep the dated iCal fixtures inside the import window on every test run.
    jest.useFakeTimers({ now: new Date('2026-09-10T12:00:00.000Z') })
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, response: null })
    ;(classifyICalEvent as jest.Mock).mockReturnValue('unknown')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('registra sync_logs com status "success" (modo property_ids) quando o listing sincroniza sem erros', async () => {
    const listing = {
      id: 'listing-1',
      ical_url: 'https://example.com/cal.ics',
      property_id: 'prop-1',
      properties: { id: 'prop-1', name: 'Casa Azul', organization_id: 'org-1' },
    }

    const insertedSyncLogs: Array<Record<string, unknown>> = []

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn((selection: string) => makeQuery(
              selection === 'property_id, organization_id'
                ? {
                    data: {
                      property_id: listing.property_id,
                      organization_id: 'org-1',
                      platforms: null,
                      properties: {},
                    },
                    error: null,
                  }
                : { data: [listing], error: null }
            )),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
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

    const request = createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: ['prop-1'] }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)

    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      property_listing_id: 'listing-1',
      sync_type: 'ical',
      direction: 'inbound',
      status: 'success',
    })
    expect(insertedSyncLogs[0].synced_at).toEqual(expect.any(String))
  })

  it('cria reserva usando a relação composta property/organization sem embed ambíguo', async () => {
    const listing = {
      id: 'listing-create',
      ical_url: 'https://example.com/create.ics',
      property_id: 'prop-create',
      properties: { id: 'prop-create', name: 'Casa Nova', organization_id: 'org-create' },
    }
    const propertySelections: string[] = []
    const insertedReservations: Array<Record<string, unknown>> = []
    let propertySelectCall = 0
    let reservationSelectCall = 0

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn((selection: string) => {
              propertySelections.push(selection)
              propertySelectCall++

              if (propertySelectCall === 1) return makeQuery({ data: [listing], error: null })
              if (propertySelectCall === 2) {
                return makeQuery({
                  data: {
                    property_id: listing.property_id,
                    organization_id: 'org-create',
                    properties: {
                      cleaning_fee: 0,
                      cleaning_fee_type: 'fixed',
                      pet_fee: 0,
                      pet_fee_type: 'fixed',
                    },
                  },
                  error: null,
                })
              }
              if (propertySelectCall === 3) return makeQuery({ data: [{ id: listing.id }], error: null })

              return makeQuery({
                data: { properties: { name: 'Casa Nova', owner_id: null } },
                error: null,
              })
            }),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }

        if (table === 'reservations') {
          return {
            select: jest.fn(() => {
              reservationSelectCall++
              return makeQuery(
                reservationSelectCall === 1
                  ? { data: null, error: null }
                  : { data: [], error: null }
              )
            }),
            insert: jest.fn((payload: Record<string, unknown>) => {
              insertedReservations.push(payload)
              return Promise.resolve({ data: null, error: null })
            }),
          }
        }

        if (table === 'guests') {
          return {
            insert: jest.fn(() => makeQuery({ data: { id: 'guest-create' }, error: null })),
          }
        }

        if (table === 'sync_logs') {
          return { insert: jest.fn(() => Promise.resolve({ data: null, error: null })) }
        }

        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'ical-create-uid',
      summary: 'Maria Silva',
      description: '',
      start: new Date('2026-09-10T00:00:00.000Z'),
      end: new Date('2026-09-12T00:00:00.000Z'),
    }])
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')

    const response = await POST(createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: [listing.property_id] }),
    }))

    expect(response.status).toBe(200)
    expect(propertySelections).toContain(
      'property_id, organization_id'
    )
    expect(insertedReservations).toHaveLength(0)
    expect(importPendingICalReservation).toHaveBeenCalledWith(mockSupabase, 'org-create', 'event-audit', expect.arrayContaining(['ical-create-uid']))
    expect(mockSupabase.from).not.toHaveBeenCalledWith('guests')
    expect(enqueueEmail).not.toHaveBeenCalled()
  })

  it.each(['booking', 'airbnb'])('preserva campos manuais ao atualizar metadata de reserva %s existente', async (platform) => {
    const listing = {
      id: 'listing-update',
      ical_url: 'https://example.com/update.ics',
      property_id: 'prop-update',
      properties: { id: 'prop-update', name: 'Casa Atualizada', organization_id: 'org-update' },
    }

    const updatedPayloads: Array<Record<string, unknown>> = []
    const propertySelections: string[] = []
    let propertySelectCall = 0
    let reservationSelectCall = 0

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn((selection: string) => {
              propertySelections.push(selection)
              propertySelectCall++

              if (propertySelectCall === 1) return makeQuery({ data: [listing], error: null })
              if (propertySelectCall === 2) {
                return makeQuery({
                  data: {
                    property_id: listing.property_id,
                    organization_id: 'org-update',
                    properties: {
                      cleaning_fee: 0,
                      cleaning_fee_type: 'fixed',
                      pet_fee: 0,
                      pet_fee_type: 'fixed',
                    },
                  },
                  error: null,
                })
              }
              if (propertySelectCall === 3) {
                return makeQuery({
                  data: { properties: { name: 'Casa Atualizada', owner_id: null } },
                  error: null,
                })
              }

              return makeQuery({ data: [], error: null })
            }),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'reservations') {
          return {
            select: jest.fn(() => {
              reservationSelectCall++
              return makeQuery(
                reservationSelectCall === 1
                  ? { data: [{ id: 'reservation-update', external_id: 'manual-1', calendar_event_id: 'event-audit' }], error: null }
                  : { data: [], error: null }
              )
            }),
            update: jest.fn((payload: Record<string, unknown>) => {
              updatedPayloads.push(payload)
              return makeQuery({ data: { id: 'reservation-update' }, error: null })
            }),
          }
        }
        if (table === 'sync_logs') {
          return {
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'guests') {
          return {
            insert: jest.fn(() => makeQuery({ data: { id: 'guest-update' }, error: null })),
          }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: `1234567890@${platform}.com`,
      summary: 'Maria Silva',
      description: 'NAME: Feed Guest\nGUESTS: 9',
      start: new Date('2026-09-10T00:00:00.000Z'),
      end: new Date('2026-09-12T00:00:00.000Z'),
    }])
    ;(classifyICalEvent as jest.Mock).mockReturnValue('reservation')

    const response = await POST(createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: [listing.property_id] }),
    }))

    expect(response.status).toBe(200)
    expect(updatedPayloads).toHaveLength(0)
    expect(importPendingICalReservation).toHaveBeenCalledWith(mockSupabase, 'org-update', 'event-audit', expect.any(Array))
    expect(mockSupabase.from).not.toHaveBeenCalledWith('guests')
    expect(enqueueEmail).not.toHaveBeenCalled()
    expect(propertySelections).toContain(
      'property_id, organization_id'
    )
  })

  it('registra sync_logs com status "failed" e error_message preenchido (modo property_ids) quando o listing falha', async () => {
    const listing = {
      id: 'listing-2',
      ical_url: 'https://example.com/broken.ics',
      property_id: 'prop-2',
      properties: { id: 'prop-2', name: 'Casa Verde', organization_id: 'org-1' },
    }

    const insertedSyncLogs: Array<Record<string, unknown>> = []

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
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
    ;(importICalFromUrl as jest.Mock).mockRejectedValue(new Error('Falha ao buscar iCal remoto'))

    const request = createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: ['prop-2'] }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.errors).toEqual(expect.arrayContaining([expect.stringContaining('Falha ao buscar iCal remoto')]))

    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      property_listing_id: 'listing-2',
      sync_type: 'ical',
      direction: 'inbound',
      status: 'failed',
      error_message: 'Falha ao buscar iCal remoto',
    })
  })

  it('registra sync_logs com status "failed" (modo legado) e retorna 500 quando o listing falha', async () => {
    const insertedSyncLogs: Array<Record<string, unknown>> = []

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: { id: 'listing-3', property_id: 'prop-3' }, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'properties') {
          return {
            select: jest.fn(() => makeQuery({ data: { organization_id: 'org-1' }, error: null })),
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
    ;(importICalFromUrl as jest.Mock).mockRejectedValue(new Error('URL iCal inválida'))

    const request = createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com/broken.ics',
        property_id: 'prop-3',
        listing_id: 'listing-3',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('URL iCal inválida')

    expect(insertedSyncLogs).toHaveLength(1)
    expect(insertedSyncLogs[0]).toMatchObject({
      property_listing_id: 'listing-3',
      sync_type: 'ical',
      direction: 'inbound',
      status: 'failed',
      error_message: 'URL iCal inválida',
    })
  })

  it.each([true, false])('contabiliza cancelamento ausente somente quando CAS vence (%s)', async casWon => {
    const listing = {
      id: 'listing-cancel',
      ical_url: 'https://example.com/cancel.ics',
      property_id: 'prop-cancel',
      properties: { id: 'prop-cancel', name: 'Casa Cancela', organization_id: 'org-1' },
    }
    const reservationUpdate = jest.fn(() => makeQuery({ data: casWon ? [{ id: 'reservation-cancel' }] : [], error: null }))
    let propertySelectCall = 0

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => {
              propertySelectCall++
              if (propertySelectCall === 1) return makeQuery({ data: [listing], error: null })
              return makeQuery({
                data: {
                  property_id: listing.property_id,
                  organization_id: 'org-1',
                  properties: {
                    cleaning_fee: 0,
                    cleaning_fee_type: 'fixed',
                    pet_fee: 0,
                    pet_fee_type: 'fixed',
                  },
                },
                error: null,
              })
            }),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'calendar_events') {
          return {
            upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'reservations') {
          return {
            select: jest.fn(() => makeQuery({
              data: [{ id: 'reservation-cancel', external_id: 'booking_777', check_out: '2026-09-20' }],
              error: null,
            })),
            update: reservationUpdate,
          }
        }
        if (table === 'sync_logs') {
          return {
            insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
          }
        }
        if (table === 'guests') {
          return {
            insert: jest.fn(() => makeQuery({ data: { id: 'guest-cancel' }, error: null })),
          }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([])

    const response = await POST(createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: [listing.property_id] }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.totals.cancelled).toBe(casWon ? 1 : 0)
    expect(reservationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'cancelled',
      cancelled_at: expect.any(String),
      updated_at: expect.any(String),
    }))
  })

  it.each([
    ...[true, false].flatMap(pilotEnabled => ['empty', 'created', 'updated', 'blocked', 'ignored', 'error'].map(action => ({ action, auditStatus: 'unmatched', pilotEnabled, long: false }))),
    { action: 'created', auditStatus: 'unmatched', pilotEnabled: false, long: true },
    { action: 'updated', auditStatus: 'matched', pilotEnabled: false, long: false },
    { action: 'ignored', auditStatus: 'ignored', pilotEnabled: false, long: false },
  ])(
    'registra resultado pendente $action (audit=$auditStatus, pilot=$pilotEnabled, long=$long) preservando ocupação presente por calendar_event_id e cancelando ausente sem email', async ({ action, auditStatus, pilotEnabled, long }) => {
    ;(upsertCalendarEventAudit as jest.Mock).mockResolvedValue({ id: 'event-audit', status: auditStatus })
    const result = { reservation_id: 'pending-reservation', calendar_event_id: 'event-audit', created: action === 'created', action }
    if (action === 'error') {
      ;(importPendingICalReservation as jest.Mock).mockRejectedValue(new Error('Falha ao incluir reserva pendente: RPC indisponível'))
    } else {
      ;(importPendingICalReservation as jest.Mock).mockResolvedValue(result)
    }
    const listing = {
      id: 'listing-booking-pilot',
      ical_url: 'https://example.com/booking-empty.ics',
      property_id: 'prop-booking-pilot',
      properties: { id: 'prop-booking-pilot', name: 'Casa Piloto', organization_id: 'org-1' },
    }
    const reservationSelect = jest.fn(() => makeQuery({ data: [{ id: 'pending-reservation', external_id: 'different-booking-code', calendar_event_id: 'event-audit', check_out: '2026-09-20' }], error: null }))
    const reservationUpdate = jest.fn(() => makeQuery({ data: [{ id: 'pending-reservation' }], error: null }))
    const syncLogInsert = jest.fn(() => Promise.resolve({ data: null, error: null }))

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn((selection: string) => makeQuery(
              selection === 'property_id, organization_id'
                ? {
                    data: {
                      property_id: listing.property_id,
                      organization_id: 'org-1',
                      platforms: { name: 'Booking.com', display_name: 'Booking' },
                      properties: {},
                    },
                    error: null,
                  }
                : { data: [listing], error: null }
            )),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'reservations') {
          return { select: reservationSelect, update: reservationUpdate }
        }
        if (table === 'sync_logs') {
          return { insert: syncLogInsert }
        }
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue(action === 'empty' ? [] : [{
      uid: 'opaque@booking.com', summary: 'CLOSED - Not available', description: '',
      start: new Date('2026-09-16T00:00:00.000Z'), end: new Date(long ? '2027-09-20T00:00:00.000Z' : '2026-09-20T00:00:00.000Z'),
    }])
    ;(classifyICalEvent as jest.Mock).mockReturnValue('block')
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({
      enabled: pilotEnabled,
      pilot_platforms: ['booking'],
    })

    const response = await POST(createTestRequest('http://localhost/api/sync/import', {
      method: 'POST',
      body: JSON.stringify({ property_ids: [listing.property_id] }),
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.totals.cancelled).toBe(action === 'empty' ? 1 : 0)
    if (action === 'error') expect(reservationSelect).not.toHaveBeenCalled()
    else expect(reservationSelect).toHaveBeenCalled()
    if (action === 'empty') expect(reservationUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
    else expect(reservationUpdate).not.toHaveBeenCalled()
    expect(enqueueEmail).not.toHaveBeenCalled()
    if (action === 'empty') {
      expect(importPendingICalReservation).not.toHaveBeenCalled()
    } else {
      expect(importPendingICalReservation).toHaveBeenCalledWith(mockSupabase, 'org-1', 'event-audit', expect.any(Array))
    }
    if (action === 'error') {
      expect(body.errors).toEqual([expect.stringContaining('Falha ao incluir reserva pendente: RPC indisponível')])
      expect(syncLogInsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed', error_message: 'Falha ao incluir reserva pendente: RPC indisponível',
      }))
    } else {
      expect(body.totals).toMatchObject({
        created: action === 'created' ? 1 : 0,
        updated: action === 'updated' ? 1 : 0,
        blocked: action === 'blocked' ? 1 : 0,
        skipped: action === 'ignored' ? 1 : 0,
      })
      if (action === 'created') {
        ;(importPendingICalReservation as jest.Mock).mockResolvedValue({ ...result, created: false, action: 'updated' })
        const repeated = await POST(createTestRequest('http://localhost/api/sync/import', {
          method: 'POST', body: JSON.stringify({ property_ids: [listing.property_id] }),
        }))
        expect((await repeated.json()).totals).toMatchObject({ created: 0, updated: 1 })
        expect(reservationUpdate).not.toHaveBeenCalled()
        expect(enqueueEmail).not.toHaveBeenCalled()
      }
    }
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
          select: jest.fn((selection: string) => makeQuery({ data: selection === 'property_id, organization_id' ? {
            property_id: listing.property_id, organization_id: 'org-cleanup', properties: {}, platforms: { name: 'Booking.com' },
          } : [listing], error: null })),
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
    const response = await POST(createTestRequest('http://localhost/api/sync/import', { method: 'POST', body: JSON.stringify({ property_ids: ['property-cleanup'] }) }))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.errors).toEqual([expect.stringContaining('cleanup unavailable')])
    expect(syncLogInsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error_message: expect.stringContaining('cleanup unavailable') }))
    expect(enqueueEmail).not.toHaveBeenCalled()
    if (failure === 'cancel-read') expect(reservationUpdate).not.toHaveBeenCalled()
    if (failure !== 'block-delete') expect(blockDelete).not.toHaveBeenCalled()
  })

})
