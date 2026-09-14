import { POST } from '@/app/api/reservations/[id]/ical-review/route'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
const id = '10000000-0000-4000-8000-000000000001'
const rpc = jest.fn()
const request = (action: string) => createTestRequest(`http://localhost/api/reservations/${id}/ical-review`, {
  method: 'POST', body: JSON.stringify({ action, organization_id: 'untrusted-org' }),
})

describe('iCal host review API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'session-org', accessAllProperties: true })
    rpc.mockResolvedValue({ data: { action: 'confirm' }, error: null })
    ;(createAdminClient as jest.Mock).mockReturnValue({ rpc })
  })
  it.each(['confirm', 'block'])('uses the session tenant for %s', async (action) => {
    expect((await POST(request(action), { params: Promise.resolve({ id }) })).status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('review_ical_pending_reservation', {
      p_organization_id: 'session-org', p_reservation_id: id, p_action: action,
    })
  })
  it('rejects invalid action without writing', async () => {
    expect((await POST(request('delete'), { params: Promise.resolve({ id }) })).status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects a reservation outside assigned properties', async () => {
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'session-org', userId: 'host', accessAllProperties: false })
    const assignments = { select: jest.fn(() => assignments), eq: jest.fn(async () => ({ data: [], error: null })) }
    const reservation = {
      select: jest.fn(() => reservation), eq: jest.fn(() => reservation), in: jest.fn(() => reservation),
      maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    }
    ;(createAdminClient as jest.Mock).mockReturnValue({ rpc, from: (table: string) => table === 'user_properties' ? assignments : reservation })
    expect((await POST(request('confirm'), { params: Promise.resolve({ id }) })).status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })
  it('returns a conflict when review races another decision', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023' } })
    expect((await POST(request('block'), { params: Promise.resolve({ id }) })).status).toBe(409)
  })
})
