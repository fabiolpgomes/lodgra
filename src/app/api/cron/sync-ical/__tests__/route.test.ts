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
import { importICalFromUrl } from '@/lib/ical/icalService'

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
      properties: { name: 'Casa Azul', organization_id: 'org-1' },
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
    })
    expect(insertedSyncLogs[0].synced_at).toEqual(expect.any(String))
  })

  it('registra sync_logs com status "failed" e error_message preenchido quando o listing falha', async () => {
    const listing = {
      id: 'listing-2',
      ical_url: 'https://example.com/broken.ics',
      sync_enabled: true,
      property_id: 'prop-2',
      properties: { name: 'Casa Verde', organization_id: 'org-1' },
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
    })
  })

  it('retorna 401 quando o Authorization header não corresponde ao CRON_SECRET', async () => {
    const request = createTestRequest('http://localhost/api/cron/sync-ical', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })
})
