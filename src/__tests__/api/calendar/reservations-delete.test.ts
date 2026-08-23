import { DELETE } from '@/app/api/calendar/reservations/[id]/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/auth/getUserAccess', () => ({
  getUserAccess: jest.fn(),
}))

jest.mock('@/lib/reservations/cancelReservation', () => ({
  cancelReservation: jest.fn(),
}))

jest.mock('@/lib/ical/syncWebhook', () => ({
  notifyPlatformSync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/integrations/platform-notifier', () => ({
  notifyAllPlatforms: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/email/queue', () => ({
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/reservations/syncToBeds24', () => ({
  cancelReservationInBeds24: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

describe('DELETE /api/calendar/reservations/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should cancel a reservation successfully', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'reservations') {
          return {
            select: jest.fn((columns: string) => {
              if (columns.includes('beds24_booking_id')) {
                return {
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        beds24_booking_id: 'beds24-123',
                        source: 'beds24',
                      },
                      error: null,
                    }),
                  }),
                }
              }

              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'res-123',
                      property_id: 'prop-123',
                      check_in: '2026-06-23',
                      check_out: '2026-06-24',
                      guests: { first_name: 'João', last_name: 'Silva' },
                    },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'properties') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'prop-123',
                    name: 'Casa Teste',
                    owner_id: 'owner-1',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'owners') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    full_name: 'Owner Test',
                    email: 'owner@example.com',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        }
      }),
    }

    const mockAdminSupabase = {
      from: mockSupabase.from,
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    ;(createAdminClient as jest.Mock).mockReturnValue(mockAdminSupabase)
    ;(getUserAccess as jest.Mock).mockResolvedValue({
      profile: {
        id: 'user-1',
        email: 'admin@example.com',
        full_name: 'Admin Test',
        role: 'admin',
        avatar_url: null,
        access_all_properties: true,
        organization_id: 'org-1',
      },
      propertyIds: null,
    })
    ;(cancelReservation as jest.Mock).mockResolvedValue({
      ok: true,
      alreadyCancelled: false,
      reservationId: 'res-123',
      refundInfo: {
        refund_amount: 123.45,
        refund_percentage: 75,
        stripe_refund_id: 're_123',
        processed_at: '2026-08-23T10:00:00.000Z',
      },
    })

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/res-123',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'res-123' }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.already_cancelled).toBe(false)
    expect(data.refund_info).toEqual({
      refund_amount: 123.45,
      refund_percentage: 75,
      stripe_refund_id: 're_123',
      processed_at: '2026-08-23T10:00:00.000Z',
    })
  })

  it('should return 404 if reservation not found', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/nonexistent',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Reserva não encontrada')
  })
})
