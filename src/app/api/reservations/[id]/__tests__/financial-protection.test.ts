import { NextRequest, NextResponse } from 'next/server'
import { PUT } from '../route'

const mockFrom = jest.fn()
const mockUpdate = jest.fn()
const mockInsert = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) },
  from: (...args: unknown[]) => mockFrom(...args),
}) }))
jest.mock('@/lib/auth/getUserAccess', () => ({ getUserAccess: jest.fn() }))
jest.mock('@/lib/reservations/cancelReservation', () => ({ cancelReservation: jest.fn() }))

describe('generic reservation edit financial protection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(NextResponse.json as jest.Mock).mockImplementation((body, init) => ({ status: init?.status ?? 200, json: async () => body }))
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'reservation' }, error: null }) }) }) })
    mockInsert.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return { insert: mockInsert }
      return {
        update: mockUpdate,
        select: (fields: string) => fields === 'id'
          ? { eq: () => ({ neq: () => ({ neq: () => ({ lt: () => ({ gt: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) }) }
          : { eq: () => ({ single: async () => ({ data: { guest_name: 'Ana', property_id: 'property', check_in: '2026-09-15', check_out: '2026-09-18', total_price: 700 }, error: null }) }) },
      }
    })
  })

  const request = (body: Record<string, unknown>) => ({ json: async () => body }) as NextRequest
  const context = { params: Promise.resolve({ id: 'reservation' }) }

  it('does not reset financial amounts or audit a price change when price is omitted', async () => {
    const response = await PUT(request({ guest_name: 'Ana', notes: 'updated' }), context)
    expect(response.status).toBe(200)
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('total_amount')
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('total_price')
    for (const field of ['platform_fee', 'net_amount', 'commission_amount', 'service_fee_amount', 'discount_amount']) {
      expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty(field)
    }
    expect(mockInsert.mock.calls[0][0].details.changed_fields).not.toHaveProperty('total_price')
  })

  it('returns actionable conflict without an audit when the database rejects an overwrite', async () => {
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '40001', message: 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT' } }) }) }) })
    const response = await PUT(request({ guest_name: 'Ana', total_price: 0 }), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('preserves explicit zero for reservations without a protected snapshot', async () => {
    const response = await PUT(request({ guest_name: 'Ana', total_price: 0, platform_fee: null, net_amount: 25, commission_amount: 0, service_fee_amount: 0, discount_amount: 0 }), context)
    expect(response.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ total_amount: 0, total_price: 0, platform_fee: null, net_amount: 25, commission_amount: 0, service_fee_amount: 0, discount_amount: 0 }))
  })

  it('returns a refreshable conflict for a native serialization failure', async () => {
    mockUpdate.mockReturnValue({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: '40001', message: 'could not serialize access due to concurrent update' } }) }) }) })
    const response = await PUT(request({ guest_name: 'Ana', total_price: 0 }), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'RESERVATION_CONFLICT' })
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
