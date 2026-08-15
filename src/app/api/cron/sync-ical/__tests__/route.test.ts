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
import { importICalFromUrl, isBlockedEvent } from '@/lib/ical/icalService'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/ical/icalService', () => ({
  importICalFromUrl: jest.fn(),
  isBlockedEvent: jest.fn(() => false),
}))

jest.mock('@/lib/email/queue', () => ({
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
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
    in: jest.fn(() => query),
    not: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    update: jest.fn(() => query),
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
    ;(isBlockedEvent as jest.Mock).mockReturnValue(false)
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

  it('conta bloqueios de calendário persistidos como registros processados', async () => {
    const listing = {
      id: 'listing-block',
      ical_url: 'https://example.com/blocked.ics',
      sync_enabled: true,
      property_id: 'prop-block',
      properties: { name: 'Casa Bloqueada', organization_id: 'org-1', is_active: true },
    }
    const insertedSyncLogs: Array<Record<string, unknown>> = []
    let calendarBlockSelectCount = 0

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
              return makeQuery(calendarBlockSelectCount === 1
                ? { data: { id: 'block-1' }, error: null }
                : { data: [], error: null })
            }),
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
        return { select: jest.fn(() => makeQuery({ data: [], error: null })) }
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(isBlockedEvent as jest.Mock).mockReturnValue(true)
    ;(importICalFromUrl as jest.Mock).mockResolvedValue([{
      uid: 'blocked-uid',
      summary: 'Not available',
      description: '',
      start: new Date('2026-09-10T00:00:00.000Z'),
      end: new Date('2026-09-12T00:00:00.000Z'),
    }])

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
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

  it('delimita a procura de reserva existente pelo listing e organização', async () => {
    const listing = {
      id: 'listing-tenant-safe',
      ical_url: 'https://example.com/tenant-safe.ics',
      sync_enabled: true,
      property_id: 'prop-tenant-safe',
      properties: { name: 'Casa Segura', organization_id: 'org-tenant-safe', is_active: true },
    }
    const reservationQuery = makeQuery({ data: { id: 'existing-reservation' }, error: null })

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_listings') {
          return {
            select: jest.fn(() => makeQuery({ data: [listing], error: null })),
            update: jest.fn(() => makeQuery({ data: null, error: null })),
          }
        }
        if (table === 'reservations') return reservationQuery
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

    const response = await GET(buildRequest())

    expect(response.status).toBe(200)
    expect(reservationQuery.eq).toHaveBeenCalledWith('external_id', expect.any(String))
    expect(reservationQuery.eq).toHaveBeenCalledWith('property_listing_id', listing.id)
    expect(reservationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-tenant-safe')
  })
})
