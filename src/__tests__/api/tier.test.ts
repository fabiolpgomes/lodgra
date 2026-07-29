import { GET } from '@/app/api/guests/[id]/tier/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

// Mock the Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>

describe('GET /api/guests/[id]/tier', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 if guest_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/guests//tier')

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

    const request = new NextRequest('http://localhost:3000/api/guests/guest-123/tier')

    const response = await GET(request, { params: { id: 'guest-123' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Convidado não encontrado')
  })

  it('should calculate tier for guest with Bronze score', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-1',
          first_name: 'João',
          last_name: 'Silva',
          email: 'joao@example.com',
          loyalty_score: 15,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-1/tier')

    const response = await GET(request, { params: { id: 'guest-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.guest_id).toBe('guest-1')
    expect(data.current_tier).toBe('Bronze')
    expect(data.loyalty_score).toBe(15)
    expect(data.base_discount_percent).toBe(0)
    expect(data.next_tier).toBe('Silver')
    expect(data.points_to_next).toBe(11) // 26 - 15
  })

  it('should calculate tier for guest with Silver score', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-2',
          first_name: 'Maria',
          last_name: 'Santos',
          email: 'maria@example.com',
          loyalty_score: 35,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-2/tier')

    const response = await GET(request, { params: { id: 'guest-2' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.current_tier).toBe('Silver')
    expect(data.base_discount_percent).toBe(5)
    expect(data.next_tier).toBe('Gold')
    expect(data.points_to_next).toBe(16) // 51 - 35
    expect(data.discount_gain_at_next).toBe(5) // 10 - 5
  })

  it('should calculate tier for guest with Platinum score', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-3',
          first_name: 'Ana',
          last_name: 'Costa',
          email: 'ana@example.com',
          loyalty_score: 85,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-3/tier')

    const response = await GET(request, { params: { id: 'guest-3' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.current_tier).toBe('Platinum')
    expect(data.base_discount_percent).toBe(15)
    expect(data.next_tier).toBeNull()
    expect(data.points_to_next).toBe(0)
    expect(data.discount_gain_at_next).toBe(0)
  })

  it('should include perks in response', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-4',
          first_name: 'Paulo',
          last_name: 'Oliveira',
          email: 'paulo@example.com',
          loyalty_score: 60,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-4/tier')

    const response = await GET(request, { params: { id: 'guest-4' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.perks).toBeDefined()
    expect(Array.isArray(data.perks)).toBe(true)
    expect(data.perks.length).toBeGreaterThan(0)
  })

  it('should include point ranges in response', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-5',
          first_name: 'Elena',
          last_name: 'Garcia',
          email: 'elena@example.com',
          loyalty_score: 45,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-5/tier')

    const response = await GET(request, { params: { id: 'guest-5' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.points_min).toBeDefined()
    expect(data.points_max).toBeDefined()
    expect(data.points_min).toBeLessThanOrEqual(data.loyalty_score)
    expect(data.points_max).toBeGreaterThanOrEqual(data.loyalty_score)
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

    const request = new NextRequest('http://localhost:3000/api/guests/guest-6/tier')

    const response = await GET(request, { params: { id: 'guest-6' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Erro ao buscar')
  })

  it('should handle missing loyalty_score (calculate from bookings)', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    // Mock guest query with null loyalty_score
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-7',
          first_name: 'Lucas',
          last_name: 'Ferreira',
          email: 'lucas@example.com',
          loyalty_score: null,
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
        ],
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-7/tier')

    const response = await GET(request, { params: { id: 'guest-7' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should calculate score from bookings: 1 stay (5 pts) + zero cancellation bonus (10 pts) = 15
    expect(data.loyalty_score).toBe(15)
    expect(data.current_tier).toBe('Bronze')
  })

  it('should include last_updated timestamp', async () => {
    const mockSupabase = {
      from: jest.fn(),
    }

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValueOnce({
        data: {
          id: 'guest-8',
          first_name: 'Bruno',
          last_name: 'Alves',
          email: 'bruno@example.com',
          loyalty_score: 30,
        },
        error: null,
      }),
    })

    mockCreateAdminClient.mockResolvedValueOnce(mockSupabase as any)

    const request = new NextRequest('http://localhost:3000/api/guests/guest-8/tier')

    const response = await GET(request, { params: { id: 'guest-8' } })
    const data = await response.json()

    expect(data.last_updated).toBeDefined()
    expect(new Date(data.last_updated)).toBeInstanceOf(Date)
  })
})
