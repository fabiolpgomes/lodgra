jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn(async () => ({ marker: 'client' })) }))
jest.mock('@/lib/logger', () => ({
  generateRequestId: jest.fn(() => 'req_test'),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))
jest.mock('@/lib/financial/payout-service.server', () => {
  class PayoutServiceError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message) }
  }
  return { PayoutServiceError }
})
jest.mock('@/lib/financial/reservation-financial-service.server', () => ({
  getReservationFinancialFacts: jest.fn(), replaceReservationFinancialFacts: jest.fn(),
}))

import { NextResponse } from 'next/server'
import { GET, PUT } from '../route'
import { PayoutServiceError } from '@/lib/financial/payout-service.server'
import {
  getReservationFinancialFacts,
  replaceReservationFinancialFacts,
} from '@/lib/financial/reservation-financial-service.server'

const reservationId = '6ea55539-02d4-4f8b-a0ef-984789d7504b'
const context = (id = reservationId) => ({ params: Promise.resolve({ id }) })
const request = (body: unknown) => new Request(`http://localhost/api/reservations/${reservationId}/financial-facts`, {
  method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('reservation financial facts route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(NextResponse.json as jest.Mock).mockImplementation((body, init) => ({
      status: init?.status ?? 200, json: async () => body,
      headers: new Map(Object.entries(init?.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])),
    }))
  })

  it('returns private tenant-scoped facts', async () => {
    ;(getReservationFinancialFacts as jest.Mock).mockResolvedValue({ requestId: 'req_test', currentSnapshot: null })
    const response = await GET(new Request('http://localhost'), context())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('validates and routes a declared replacement without accepting tenant identity', async () => {
    const payload = { expectedCurrentVersion: null, factMode: 'declared_owner_base', currency: 'EUR', declaredOwnerBaseAmount: '500.00' }
    ;(replaceReservationFinancialFacts as jest.Mock).mockResolvedValue({ requestId: 'req_test' })
    expect((await PUT(request(payload), context())).status).toBe(200)
    expect(replaceReservationFinancialFacts).toHaveBeenCalledWith({ marker: 'client' }, reservationId, payload, 'req_test')
    expect((await PUT(request({ ...payload, organizationId: 'untrusted' }), context())).status).toBe(422)
  })

  it('sanitizes authorization, conflicts and invalid ids', async () => {
    ;(getReservationFinancialFacts as jest.Mock).mockRejectedValue(new PayoutServiceError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada'))
    expect((await GET(new Request('http://localhost'), context())).status).toBe(404)
    expect((await GET(new Request('http://localhost'), context('bad'))).status).toBe(422)
    ;(replaceReservationFinancialFacts as jest.Mock).mockRejectedValue(new PayoutServiceError(409, 'FINANCIAL_FACTS_CONFLICT', 'Conflito'))
    expect((await PUT(request({ expectedCurrentVersion: 1, factMode: 'declared_owner_base', currency: 'EUR', declaredOwnerBaseAmount: '500.00' }), context())).status).toBe(409)
  })
})
