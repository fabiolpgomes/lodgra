import { GET as getReservations } from '@/app/api/calendar/reservations/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/auth/getUserProperties', () => ({
  getUserPropertyIds: jest.fn(),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => ({
    authorized: true,
    response: null,
    organizationId: 'org-1',
  })),
}))

describe('GET /api/calendar/reservations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('preserves null currency instead of inventing EUR', async () => {
    const reservationsResult = {
      data: [
        {
          id: 'res-1',
          property_id: 'prop-1',
          check_in: '2026-08-10',
          check_out: '2026-08-12',
          reservation_status: 'confirmed',
          number_of_guests: 2,
          guest_name: 'João Silva',
          first_name: 'João',
          last_name: 'Silva',
          total_price: 500,
          currency: null,
        },
      ],
      error: null,
    }

    const reservationsQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      then: (resolve: (value: typeof reservationsResult) => void, reject: (reason?: unknown) => void) =>
        Promise.resolve(reservationsResult).then(resolve, reject),
    }

    const propertiesQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ id: 'prop-1', name: 'Casa Azul' }],
        error: null,
      }),
    }

    const mockAdminClient = {
      from: jest.fn((table: string) => {
        if (table === 'reservations') return reservationsQuery
        if (table === 'properties') return propertiesQuery
        return {}
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue({})
    ;(createAdminClient as jest.Mock).mockReturnValue(mockAdminClient)
    ;(getUserPropertyIds as jest.Mock).mockResolvedValue(['prop-1'])

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations?from=2026-08-01&to=2026-08-31',
      { method: 'GET' }
    )

    const response = await getReservations(request)

    expect(response.status).toBe(200)
    const events = await response.json()
    expect(events).toHaveLength(1)
    expect(events[0].extendedProps.currency).toBeNull()
  })
})
