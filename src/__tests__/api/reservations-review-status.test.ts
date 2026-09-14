import { PUT } from '@/app/api/reservations/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/getUserAccess', () => ({ getUserAccess: jest.fn() }))
jest.mock('@/lib/reservations/cancelReservation', () => ({ cancelReservation: jest.fn() }))

describe('host review of imported reservations', () => {
  it.each([
    ['pending', null, 'pending', 200],
    ['confirmed', null, 'pending', 200],
    ['completed', null, 'confirmed', 200],
    ['confirmed', 'event-1', 'cancelled', 409],
    ['confirmed', 'event-1', 'pending', 409],
    ['pending', 'event-1', 'pending', 200],
  ])('handles status %s for event %s from %s', async (status, eventId, originalStatus, expectedStatus) => {
    const update = jest.fn()
    const original = {
      guest_name: 'Host entered name', property_id: 'property-1',
      check_in: '2026-09-16', check_out: '2026-09-20',
      reservation_status: originalStatus, calendar_event_id: eventId,
      number_of_guests: 2, total_price: 350,
    }
    let reads = 0
    const query = (result: unknown) => {
      const chain = {
        eq: jest.fn(() => chain), neq: jest.fn(() => chain),
        lt: jest.fn(() => chain), gt: jest.fn(() => chain),
        limit: jest.fn(async () => result), single: jest.fn(async () => result),
        select: jest.fn(() => chain),
      }
      return chain
    }
    update.mockImplementation((payload) => query({ data: payload, error: null }))
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'host-1' } }, error: null })) },
      from: jest.fn((table) => table === 'audit_logs'
        ? { insert: jest.fn(async () => ({ error: null })) }
        : { select: jest.fn(() => query({ data: reads++ === 0 ? original : [], error: null })), update }),
    })
    const response = await PUT(createTestRequest('http://localhost/api/reservations/reservation-1', {
      method: 'PUT', body: JSON.stringify({ guest_name: original.guest_name, status }),
    }), { params: Promise.resolve({ id: 'reservation-1' }) })
    expect(response.status).toBe(expectedStatus)
    if (expectedStatus === 409) {
      expect(update).not.toHaveBeenCalled()
      return
    }
    if (!eventId) expect(update).toHaveBeenCalledWith(expect.objectContaining({ status, reservation_status: status }))
    const payload = update.mock.calls[0][0]
    expect(payload).not.toHaveProperty('total_amount')
    expect(payload).not.toHaveProperty('confirmed_by_host')
    if (eventId) {
      expect(payload).not.toHaveProperty('status')
      expect(payload).not.toHaveProperty('reservation_status')
    }
  })
})
