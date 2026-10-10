jest.mock('server-only', () => ({}))

let row: Record<string, unknown> | null
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }) }),
  }),
}))
const mockRateLimit = jest.fn()
jest.mock('@/lib/rateLimit', () => ({ checkRateLimit: (...args: unknown[]) => mockRateLimit(...args) }))

import { NextResponse } from 'next/server'
import { GET } from '@/app/api/public/bookings/[id]/status/route'

const ID = '3f2b8c1e-5a4d-4e6f-9a1b-2c3d4e5f6a7b'
const call = (id = ID) =>
  GET(new Request(`http://localhost/api/public/bookings/${id}/status`) as never, { params: Promise.resolve({ id }) })
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString()

beforeEach(() => {
  ;(NextResponse.json as jest.Mock).mockImplementation((body, init) => ({
    status: init?.status ?? 200,
    json: async () => body,
    headers: new Map(Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])),
  }))
  mockRateLimit.mockReturnValue(true)
  row = { status: 'pending_payment', created_at: minutesAgo(1), booking_source: 'direct' }
})

describe('GET /api/public/bookings/:id/status', () => {
  it('404 para id que não é UUID', async () => {
    expect((await call('abc')).status).toBe(404)
  })

  it('429 quando excede o limite', async () => {
    mockRateLimit.mockReturnValue(false)
    expect((await call()).status).toBe(429)
  })

  it('404 para reserva inexistente ou que não é direta', async () => {
    row = null
    expect((await call()).status).toBe(404)
    row = { status: 'confirmed', created_at: minutesAgo(1), booking_source: 'airbnb' }
    expect((await call()).status).toBe(404)
  })

  it.each([
    ['confirmed', 1, 'confirmed'],
    ['pending_payment', 5, 'pending'],
    ['pending_payment', 60, 'expired'],
    ['cancelled', 1, 'cancelled'],
  ])('%s criada há %i min → %s', async (status, minutes, expected) => {
    row = { status, created_at: minutesAgo(minutes as number), booking_source: 'direct' }
    const res = await call()
    expect(await res.json()).toEqual({ status: expected })
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('devolve só o estado, sem dados da reserva', async () => {
    row = { status: 'confirmed', created_at: minutesAgo(1), booking_source: 'direct', guest_email: 'a@b.c' }
    expect(Object.keys(await (await call()).json())).toEqual(['status'])
  })
})
