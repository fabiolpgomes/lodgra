import { GET } from '@/app/api/cron/enrich-reservations/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

function query(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'not', 'neq', 'order', 'limit', 'eq']) chain[method] = jest.fn(() => chain)
  chain.single = jest.fn(() => Promise.resolve(result))
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

describe('legacy email enrichment preserves manual reservation fields', () => {
  const originalSecret = process.env.CRON_SECRET
  beforeEach(() => { jest.clearAllMocks(); process.env.CRON_SECRET = 'cron-test-secret' })
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
  })

  it.each(['success', 'missing', 'write-error'])('processes %s without writing host-maintained columns', async (mode) => {
    const email = {
      id: 'email-1', platform: 'booking', property_id: 'property-1', reservation_id: 'reservation-1',
      parsed_data: { guest_name: 'Different Imported Name', num_guests: 9, amount: 900, currency: 'USD' },
    }
    const reservation = { id: 'reservation-1', first_name: 'Manual', last_name: 'Guest', number_of_guests: 2, currency: 'EUR' }
    const logUpdates: Record<string, unknown>[] = []
    const reservationUpdates: Record<string, unknown>[] = []
    const reservationQuery = query({ data: mode === 'missing' ? null : reservation, error: null })
    const from = jest.fn((table: string) => {
      if (table === 'email_parse_log') return {
        ...query({ data: [email], error: null }),
        update: jest.fn((payload: Record<string, unknown>) => {
          logUpdates.push(payload)
          return query({ data: null, error: null })
        }),
      }
      if (table === 'reservations') return {
        ...reservationQuery,
        update: jest.fn((payload: Record<string, unknown>) => {
          reservationUpdates.push(payload)
          return query({ data: null, error: mode === 'write-error' ? { message: 'Database write refused' } : null })
        }),
      }
      throw new Error(`Unexpected table ${table}`)
    })
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })
    const response = await GET(createTestRequest('http://localhost/api/cron/enrich-reservations', {
      headers: { authorization: 'Bearer cron-test-secret' },
    }))
    expect(response.status).toBe(200)
    expect(reservationQuery.select).toHaveBeenCalledWith('id')
    if (mode === 'missing') {
      expect(reservationUpdates).toEqual([])
      expect(logUpdates).toEqual([expect.objectContaining({ status: 'error' })])
      expect(await response.json()).toMatchObject({ enriched: 0, skipped: 1 })
      return
    }
    expect(reservationUpdates).toEqual([{
      email_enriched_at: expect.any(String), updated_at: expect.any(String),
    }])
    if (mode === 'write-error') {
      expect(logUpdates).toEqual([expect.objectContaining({ status: 'error' })])
      expect(await response.json()).toMatchObject({ enriched: 0, errors: 1 })
    } else {
      expect(logUpdates).toEqual([expect.objectContaining({ status: 'enriched', matched_reservation_id: reservation.id })])
      expect(await response.json()).toMatchObject({ enriched: 1, errors: 0 })
    }
  })

  it('rejects missing credentials before reading any data', async () => {
    const response = await GET(createTestRequest('http://localhost/api/cron/enrich-reservations'))
    expect(response.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
