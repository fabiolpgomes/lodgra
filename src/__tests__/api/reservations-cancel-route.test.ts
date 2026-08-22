import { POST } from '@/app/api/reservations/[id]/cancel/route'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/auth/getUserAccess', () => ({
  getUserAccess: jest.fn(),
}))

jest.mock('@/lib/reservations/cancelReservation', () => ({
  cancelReservation: jest.fn(),
}))

describe('POST /api/reservations/[id]/cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue({})
    ;(getUserAccess as jest.Mock).mockResolvedValue({
      profile: {
        id: 'user-1',
        email: 'admin@example.com',
        full_name: 'Admin',
        role: 'admin',
        avatar_url: null,
        access_all_properties: true,
        organization_id: 'org-1',
      },
      propertyIds: null,
    })
  })

  it('returns refund info when cancellation produces a refund', async () => {
    ;(cancelReservation as jest.Mock).mockResolvedValue({
      ok: true,
      alreadyCancelled: false,
      reservationId: 'reservation-1',
      refundInfo: {
        refund_amount: 900,
        refund_percentage: 100,
        stripe_refund_id: 're_123',
        processed_at: '2026-08-22T12:00:00Z',
      },
    })

    const request = createTestRequest('http://localhost/api/reservations/reservation-1/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Guest requested cancellation' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request as any, { params: Promise.resolve({ id: 'reservation-1' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual(expect.objectContaining({
      success: true,
      reservation_id: 'reservation-1',
      status: 'cancelled',
      already_cancelled: false,
      refund_info: {
        refund_amount: 900,
        refund_percentage: 100,
        stripe_refund_id: 're_123',
        processed_at: '2026-08-22T12:00:00Z',
      },
    }))
  })
})
