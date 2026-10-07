import { ingestGmail } from '../gmail-ingestion'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, fetchEmailsByIds } from '@/lib/email-parser/gmail-client'
import { getFeatureFlagStatus } from '../feature-flag'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/email-parser/gmail-client', () => ({ getValidAccessToken: jest.fn(), fetchEmailsByIds: jest.fn() }))
jest.mock('../feature-flag', () => ({ getFeatureFlagStatus: jest.fn() }))

function query(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const key of ['select', 'eq', 'in', 'update', 'upsert']) q[key] = jest.fn(() => q)
  q.then = (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return q
}

describe('Gmail staging transport', () => {
  const fetchBefore = global.fetch
  let connections: ReturnType<typeof query>
  let raw: ReturnType<typeof query>
  let from: jest.Mock
  beforeEach(() => {
    jest.clearAllMocks()
    AbortSignal.timeout = jest.fn(() => new AbortController().signal)
    connections = query({ data: [{ id: 'connection', organization_id: 'tenant', email: 'host@example.com' }], error: null })
    raw = query({ data: [], error: null })
    from = jest.fn(table => table === 'email_connections' ? connections : raw)
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })
    ;(getFeatureFlagStatus as jest.Mock).mockResolvedValue({ enabled: true, pilot_platforms: ['booking', 'airbnb', 'flatio'] })
    ;(getValidAccessToken as jest.Mock).mockResolvedValue('private-token')
    ;(fetchEmailsByIds as jest.Mock).mockImplementation(async (_token, ids) => [{ id: ids[0], from: 'noreply@booking.com', subject: 'Nova reserva', body: 'Reservation facts', receivedAt: new Date('2026-10-01T00:00:00Z') }])
  })
  afterAll(() => { global.fetch = fetchBefore })
  it('follows pagination, scopes and stages each message without writing reservations', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'm1' }], nextPageToken: 'page-two' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ messages: [{ id: 'm2' }] }) })
    expect(await ingestGmail('tenant')).toMatchObject({ staged: 2, errors: 0 })
    expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('pageToken=page-two'), expect.anything())
    expect(raw.upsert).toHaveBeenCalledWith(expect.objectContaining({ organization_id: 'tenant', provider: 'gmail', provider_message_id: 'connection:m2' }), { onConflict: 'organization_id,provider,provider_message_id', ignoreDuplicates: true })
    expect(connections.eq).toHaveBeenCalledWith('organization_id', 'tenant')
    expect(from).not.toHaveBeenCalledWith('reservations')
  })
  it('skips persisted IDs without fetching bodies or resetting their processing state', async () => {
    raw = query({ data: [{ provider_message_id: 'connection:m1' }], error: null })
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) })
    expect(await ingestGmail()).toMatchObject({ staged: 0, duplicates: 1, errors: 0 })
    expect(fetchEmailsByIds).not.toHaveBeenCalled()
    expect(raw.upsert).not.toHaveBeenCalled()
  })
  it('does not record a successful scan when Gmail fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 })
    expect(await ingestGmail()).toMatchObject({ errors: 1 })
    expect(connections.update).not.toHaveBeenCalled()
  })
  it('does not record a successful scan when persistence fails', async () => {
    raw = query({ data: [], error: { message: 'database unavailable' } })
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: 'm1' }] }) })
    expect(await ingestGmail()).toMatchObject({ errors: 1 })
    expect(connections.update).not.toHaveBeenCalled()
  })
})
