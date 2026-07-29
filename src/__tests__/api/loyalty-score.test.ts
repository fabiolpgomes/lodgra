import { GET } from '@/app/api/guests/[id]/loyalty-score/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// Mock the Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>

describe('GET /api/guests/[id]/loyalty-score', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if guest_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/guests//loyalty-score')

    const response = await GET(request, { params: { id: '' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('guest_id inválido')
  })

  it('should return 404 if guest not found', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      }),
    }

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-123/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Convidado não encontrado')
  })

  it('should calculate loyalty score for guest with bookings', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    // Mock guest query
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-1',
          first_name: 'João',
          last_name: 'Silva',
          email: 'joao@example.com',
        },
        error: null,
      }),
    })

    // Mock reservations query
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [
          {
            id: 'res-1',
            status: 'completed',
            check_in: '2026-01-01',
            check_out: '2026-01-05',
            cancelled_at: null,
            total_amount: 500,
            created_at: '2026-01-01',
          },
          {
            id: 'res-2',
            status: 'completed',
            check_in: '2026-02-01',
            check_out: '2026-02-05',
            cancelled_at: null,
            total_amount: 500,
            created_at: '2026-02-01',
          },
        ],
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-1/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.guest_id).toBe('guest-1')
    expect(data.guest_name).toBe('João Silva')
    expect(data.loyalty_score).toBe(30) // 2 stays (10 pts) + 2 zero cancellation (20 pts)
    expect(data.breakdown).toEqual({
      completed_stays: 2,
      completed_stays_points: 10,
      zero_cancellation_bonus: 20,
      referral_points: 0,
    })
    expect(data.last_updated).toBeDefined()
  })

  it('should return 0 loyalty score for guest with no bookings', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    // Mock guest query
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-2',
          first_name: 'Maria',
          last_name: 'Santos',
          email: 'maria@example.com',
        },
        error: null,
      }),
    })

    // Mock reservations query - empty
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-2/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-2' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.loyalty_score).toBe(0)
    expect(data.breakdown.completed_stays).toBe(0)
  })

  it('should return 500 on database error', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'SOME_ERROR' },
      }),
    }

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-3/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-3' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Erro ao buscar')
  })

  it('should handle reservations query error', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    // Mock guest query success
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-4',
          first_name: 'Paulo',
          last_name: 'Oliveira',
          email: 'paulo@example.com',
        },
        error: null,
      }),
    })

    // Mock reservations query error
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed'),
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-4/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-4' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('histórico de reservas')
  })

  it('should include last_updated timestamp in response', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-5',
          first_name: 'Ana',
          last_name: 'Costa',
          email: 'ana@example.com',
        },
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest(
      'http://localhost:3000/api/guests/guest-5/loyalty-score'
    )

    const response = await GET(request, { params: { id: 'guest-5' } })
    const data = await response.json()

    expect(data.last_updated).toBeDefined()
    expect(new Date(data.last_updated)).toBeInstanceOf(Date)
  })
})
