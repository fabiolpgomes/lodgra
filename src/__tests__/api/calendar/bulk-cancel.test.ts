import { POST as bulkCancel } from '@/app/api/calendar/reservations/bulk-cancel/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => ({
    authorized: true,
    response: null,
  })),
}))

jest.mock('@/lib/email/queue', () => ({
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
}))

describe('POST /api/calendar/reservations/bulk-cancel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should cancel multiple reservations successfully', async () => {
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
                  {
                    id: 'res-2',
                    status: 'confirmed',
                    check_in: '2026-06-25',
                    check_out: '2026-06-26',
                    guests: { first_name: 'Maria', last_name: 'Santos' },
                  },
                ],
                error: null,
              }),
            }),
            update: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }
        }
        return {}
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
    ;(createAdminClient as jest.Mock).mockReturnValue({})

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/bulk-cancel',
      {
        method: 'POST',
        body: JSON.stringify({
          reservationIds: ['res-1', 'res-2'],
          reason: 'Teste de cancelamento em lote',
        }),
      }
    )

    const response = await bulkCancel(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.cancelled).toBe(2)
  })

  it('should return 400 for empty array', async () => {
    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/bulk-cancel',
      {
        method: 'POST',
        body: JSON.stringify({
          reservationIds: [],
        }),
      }
    )

    const response = await bulkCancel(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('array não-vazio')
  })
})
