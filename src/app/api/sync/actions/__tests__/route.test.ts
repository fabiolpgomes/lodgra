import { GET } from '../route'
import { POST as DISMISS } from '../dismiss/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSyncHealth } from '@/lib/sync-health/load'

jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/sync-health/load', () => ({ loadSyncHealth: jest.fn() }))

const ORG = '00000000-0000-0000-0000-000000000001'
const EVENT = '11111111-2222-3333-4444-555555555555'

describe('/api/sync/actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: ORG, userId: 'user-1' })
  })

  it('returns the tenant actions for the requested locale', async () => {
    ;(createAdminClient as jest.Mock).mockResolvedValue({})
    ;(loadSyncHealth as jest.Mock).mockResolvedValue({ status: 'ok', actions: [], trust: { percent: null } })
    const response = await GET(createTestRequest('http://localhost/api/sync/actions?locale=en-US'))
    expect(response.status).toBe(200)
    expect(loadSyncHealth).toHaveBeenCalledWith({}, ORG, 'en-US')
  })

  it('never reports "all clear" when the sources cannot be read', async () => {
    ;(createAdminClient as jest.Mock).mockResolvedValue({})
    ;(loadSyncHealth as jest.Mock).mockRejectedValue(new Error('SYNC_HEALTH_UNAVAILABLE'))
    expect((await GET(createTestRequest('http://localhost/api/sync/actions'))).status).toBe(503)
  })

  it('stores a dismissal with its reason for the tenant', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null })
    ;(createAdminClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => ({ upsert })) })
    const response = await DISMISS(createTestRequest('http://localhost/api/sync/actions/dismiss', {
      method: 'POST', body: JSON.stringify({ key: `event:${EVENT}`, reason: 'Bloqueio meu' }),
    }))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: ORG, action_key: `event:${EVENT}`, dismiss_reason: 'Bloqueio meu', dismissed_by: 'user-1',
    }), { onConflict: 'organization_id,action_key' })
  })

  it.each([
    [{ key: 'gmail:stale:host@gmail.com', reason: 'x' }],
    [{ key: 'calendar:abc', reason: 'x' }],
    [{ key: `event:${EVENT}`, reason: '  ' }],
  ])('refuses to hide a broken source or a dismissal without reason (%j)', async (body) => {
    const response = await DISMISS(createTestRequest('http://localhost/api/sync/actions/dismiss', { method: 'POST', body: JSON.stringify(body) }))
    expect(response.status).toBe(400)
  })
})
