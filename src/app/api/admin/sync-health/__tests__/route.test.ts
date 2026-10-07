import { GET } from '@/app/api/admin/sync-health/route'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

function query(data: unknown[] = [], error: unknown = null) {
  const q = { select: jest.fn(), eq: jest.fn(), in: jest.fn(), is: jest.fn(), gte: jest.fn(), order: jest.fn(), limit: jest.fn() }
  for (const fn of Object.values(q)) fn.mockReturnValue(q)
  q.limit.mockResolvedValue({ data, error })
  return q
}

describe('sync health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'tenant-a' })
  })
  it('denies unauthorized and missing organization before opening admin client', async () => {
    ;(requireRole as jest.Mock).mockResolvedValueOnce({ authorized: false, response: NextResponse.json({}, { status: 401 }) })
    expect((await GET()).status).toBe(401)
    ;(requireRole as jest.Mock).mockResolvedValueOnce({ authorized: true })
    expect((await GET()).status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
  it('scopes every query to authenticated tenant and bounds lists, retaining distinctions', async () => {
    const emails = query(Array.from({ length: 51 }, (_, n) => ({ id: String(n), processing_status: 'needs_review', last_error: 'Missing dates' })))
    const gmail = query([{ last_sync_at: '2026-10-01T06:00:00Z' }])
    const events = query([{ id: 'block', event_kind: 'block' }, { id: 'reservation', event_kind: 'reservation' }])
    const failures = query([{ id: 'failure', error_message: 'HTTP 403', property_listings: { organization_id: 'tenant-a' } }])
    const latest = query([{ received_at: '2026-10-01T05:00:00Z' }])
    const from = jest.fn().mockReturnValueOnce(emails).mockReturnValueOnce(gmail).mockReturnValueOnce(events).mockReturnValueOnce(failures).mockReturnValueOnce(latest)
    ;(createAdminClient as jest.Mock).mockResolvedValue({ from })
    const response = await GET()
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(requireRole).toHaveBeenCalledWith(['admin', 'gestor'])
    for (const q of [emails, gmail, events, latest]) expect(q.eq).toHaveBeenCalledWith('organization_id', 'tenant-a')
    expect(failures.eq).toHaveBeenCalledWith('property_listings.organization_id', 'tenant-a')
    expect(events.eq).toHaveBeenCalledWith('status', 'unmatched')
    expect(events.is).toHaveBeenCalledWith('reservation_id', null)
    expect(events.gte).toHaveBeenCalledWith('check_out', expect.any(String))
    expect(body.emails).toHaveLength(50)
    expect(body.truncated.emails).toBe(true)
    expect(body.events.map((e: { event_kind: string }) => e.event_kind)).toEqual(['block', 'reservation'])
    expect(body.failures[0]).not.toHaveProperty('property_listings')
    expect(body.gmail_last_sync_at).toBe('2026-10-01T06:00:00Z')
    for (const q of [emails, events, failures]) expect(q.limit).toHaveBeenCalledWith(51)
  })
  it('returns unavailable instead of fake zero pending when any query fails', async () => {
    ;(createAdminClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => query([], { message: 'sensitive database error' })) })
    const response = await GET()
    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('sensitive')
  })
})
