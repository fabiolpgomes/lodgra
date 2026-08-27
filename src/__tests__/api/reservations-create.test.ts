import { POST } from '@/app/api/admin/reservations/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/reservations/reservation-validator', () => ({
  ReservationValidator: {
    validateReservationOverlap: jest.fn(),
  },
}))

describe('POST /api/admin/reservations', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValue(mockSupabase)
  })

  const createRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest
  }

  it('should create reservation with valid data', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
        .mockResolvedValueOnce({
          data: { role: 'admin' },
        })
        .mockResolvedValueOnce({
          data: { id: 'res-001', guest_name: 'João Silva' },
        })
        .mockResolvedValueOnce({
          data: { id: 'prop-123', name: 'Property Name', address: 'Address', cancellation_policy_id: 'pol-1' },
        })
        .mockResolvedValueOnce({
          data: { name: 'Flexible', refund_percentage: 100, refund_deadline_days: 7 },
        }),
      insert: jest.fn().mockReturnThis(),
    })

    const { ReservationValidator } = require('@/lib/reservations/reservation-validator')
    ReservationValidator.validateReservationOverlap.mockResolvedValue({
      hasConflict: false,
      conflictingReservations: [],
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      guestCount: 2,
      finalPrice: 500,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('reservationId')
  })

  it('should return 401 if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      finalPrice: 500,
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 if user is not admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'guest' },
      }),
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      finalPrice: 500,
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should prevent creation if overlap detected', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
      }),
    })

    const { ReservationValidator } = require('@/lib/reservations/reservation-validator')
    ReservationValidator.validateReservationOverlap.mockResolvedValue({
      hasConflict: true,
      conflictingReservations: [
        { id: 'res-001', checkIn: '2026-08-05', checkOut: '2026-08-10' },
      ],
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-07',
      checkOut: '2026-08-12',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      finalPrice: 500,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Overlapping reservations')
  })

  it('should validate required fields', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
      }),
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      // Missing guestName and guestEmail
      finalPrice: 500,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(response.status).toBe(400)
  })

  it('should validate date format', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
      }),
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: 'invalid-date',
      checkOut: '2026-08-10',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      finalPrice: 500,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should validate checkout after checkin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'admin' },
      }),
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-10',
      checkOut: '2026-08-05',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      finalPrice: 500,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return a friendly duplicate message with channel when external key conflicts', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
    })

    mockSupabase.from
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'admin' },
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { channel: 'booking', account_name: 'Main Account' },
        }),
      })
      .mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        }),
      })

    const { ReservationValidator } = require('@/lib/reservations/reservation-validator')
    ReservationValidator.validateReservationOverlap.mockResolvedValue({
      hasConflict: false,
      conflictingReservations: [],
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
      guestName: 'João Silva',
      guestEmail: 'joao@email.com',
      guestCount: 2,
      finalPrice: 500,
      channelConnectionId: 'chan-1',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('booking (Main Account)')
  })
})
