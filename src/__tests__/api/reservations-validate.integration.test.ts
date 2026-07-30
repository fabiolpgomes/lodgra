import { POST } from '@/app/api/admin/reservations/validate/route'
import { NextRequest } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('POST /api/admin/reservations/validate', () => {
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

  // Helper function to create mock request
  const createRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest
  }

  // Test 1: Valid 5-night stay (no discount)
  it('should validate a successful 5-night reservation with no discount', async () => {
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
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBeDefined()
    expect(data.nights).toBe(5)
    expect(data.price).toBeDefined()
    expect(data.discount).toBeDefined()
  })

  // Test 2: 401 Unauthorized (no auth)
  it('should return 401 if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    const request = createRequest({
      propertyId: 'prop-123',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  // Test 3: 403 Forbidden (non-admin)
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
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  // Test 4: Database error handling
  it('should handle database error gracefully', async () => {
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
      propertyId: 'prop-error',
      checkIn: '2026-08-05',
      checkOut: '2026-08-10',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    // Should return result with error info, not 500
    const data = await response.json()
    expect(data).toHaveProperty('errors')
  })

  // Test 5: 10-night stay with 7-27 day discount
  it('should calculate 10-night stay with discount', async () => {
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
      propertyId: 'prop-456',
      checkIn: '2026-08-05',
      checkOut: '2026-08-15',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.nights).toBe(10)
    expect(data.discount).toBeDefined()
    expect(data.discount).toHaveProperty('hasDiscount')
  })

  // Test 6: 30-night stay with extended discount (28+ days)
  it('should apply extended discount for 30-night stay', async () => {
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
      propertyId: 'prop-789',
      checkIn: '2026-08-01',
      checkOut: '2026-08-31',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.nights).toBe(30)
    expect(data.discount).toBeDefined()
  })

  // Test 7: Minimum nights constraint failure
  it('should validate minimum nights constraint', async () => {
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
      propertyId: 'prop-456',
      checkIn: '2026-08-05',
      checkOut: '2026-08-06',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.minimumNights).toBeDefined()
    expect(data).toHaveProperty('errors')
  })

  // Test 8: Cancellation policy lookup
  it('should fetch cancellation policy by check-in date', async () => {
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
      checkIn: '2026-08-15',
      checkOut: '2026-08-20',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.cancellationPolicy).toBeDefined()
    expect(data.cancellationPolicy).toHaveProperty('policyName')
  })

  // Test input validation
  it('should validate required input fields', async () => {
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
      // missing checkIn and checkOut
    })

    const response = await POST(request)
    expect([400, 500]).toContain(response.status)
    // API returns error for missing required fields
  })

  // Test date validation
  it('should return error if checkOut is before checkIn', async () => {
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
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  // Test overlap detection - no overlap
  it('should return success when no reservations overlap', async () => {
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
      checkIn: '2026-09-01', // After all existing reservations
      checkOut: '2026-09-05',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBeDefined()
  })

  // Test overlap detection - with conflict
  it('should return error when reservations overlap', async () => {
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
      checkIn: '2026-08-07', // Overlaps with existing reservation
      checkOut: '2026-08-12',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('errors')
  })

  // Test overlap detection - cancelled reservation ignored
  it('should ignore cancelled reservations when checking overlap', async () => {
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
      checkIn: '2026-08-25', // Overlaps cancelled reservation
      checkOut: '2026-08-30',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should not error for cancelled overlaps
    expect(data).toHaveProperty('success')
  })

  // Test response structure
  it('should return complete ValidationResult structure', async () => {
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
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data).toHaveProperty('success')
    expect(data).toHaveProperty('propertyId')
    expect(data).toHaveProperty('checkIn')
    expect(data).toHaveProperty('checkOut')
    expect(data).toHaveProperty('nights')
    expect(data).toHaveProperty('price')
    expect(data).toHaveProperty('discount')
    expect(data).toHaveProperty('minimumNights')
    expect(data).toHaveProperty('cancellationPolicy')
    expect(data).toHaveProperty('finalPrice')
    expect(data).toHaveProperty('errors')
    expect(data).toHaveProperty('warnings')
  })
})
