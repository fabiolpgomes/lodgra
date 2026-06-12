import { POST as recover } from '@/app/api/calendar/reservations/recover/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => ({
    authorized: true,
    response: null,
  })),
}))

describe('POST /api/calendar/reservations/recover', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should recover cancelled reservations', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'reservations') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'res-1',
                    status: 'cancelled',
                    cancelled_at: '2026-06-12T10:00:00Z',
                    check_in: '2026-06-23',
                    check_out: '2026-06-24',
                    guests: { first_name: 'João', last_name: 'Silva' },
                  },
                ],
                error: null,
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/recover',
      {
        method: 'POST',
        body: JSON.stringify({
          reservationIds: ['res-1'],
        }),
      }
    )

    const response = await recover(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.recovered).toBe(1)
  })

  it('should return 400 if no cancelled reservations found', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'reservations') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'res-1',
                    status: 'confirmed',
                    check_in: '2026-06-23',
                    check_out: '2026-06-24',
                    guests: { first_name: 'João', last_name: 'Silva' },
                  },
                ],
                error: null,
              }),
            }),
          }
        }
        return {}
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/recover',
      {
        method: 'POST',
        body: JSON.stringify({
          reservationIds: ['res-1'],
        }),
      }
    )

    const response = await recover(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('cancelada')
  })
})
