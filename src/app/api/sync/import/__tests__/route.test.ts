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
import { importICalFromUrl } from '@/lib/ical/icalService'
import { requireRole } from '@/lib/auth/requireRole'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/ical/icalService', () => ({
  importICalFromUrl: jest.fn(),
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

/**
 * Thenable query-builder stub that mimics the chainable Supabase PostgREST
 * client (select().eq().not().in() etc.), resolving to `result` regardless
 * of which chain of methods was called.
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

describe('POST /api/sync/import', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, response: null })
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
})
