import { GET } from '@/app/api/properties/check-limit/route'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

jest.mock('@supabase/supabase-js')
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

describe('GET /api/properties/check-limit', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Essencial plan (1 property included, 10 max with extras)', () => {
    test('should allow property creation with 0 properties', async () => {
      const orgId = 'test-org-123'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 0,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { plan: 'essencial' },
        error: null,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canCreate).toBe(true)
      expect(data.currentCount).toBe(0)
      expect(data.limit).toBe(10)
      expect(data.plan).toBe('essencial')
    })

    test('should block property creation when limit reached (10)', async () => {
      const orgId = 'test-org-123'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 10,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { plan: 'essencial' },
        error: null,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canCreate).toBe(false)
      expect(data.currentCount).toBe(10)
      expect(data.limit).toBe(10)
      expect(data.message).toContain('Property limit reached')
    })
  })

  describe('Expansão plan (3 properties included, 10 max with extras)', () => {
    test('should allow property creation with 2 properties', async () => {
      const orgId = 'test-org-456'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 2,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { plan: 'expansao' },
        error: null,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canCreate).toBe(true)
      expect(data.currentCount).toBe(2)
      expect(data.limit).toBe(10)
      expect(data.plan).toBe('expansao')
    })

    test('should block property creation when limit reached (10)', async () => {
      const orgId = 'test-org-456'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 10,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { plan: 'expansao' },
        error: null,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canCreate).toBe(false)
      expect(data.currentCount).toBe(10)
      expect(data.limit).toBe(10)
    })
  })

  describe('Premium plan (10 properties included, unlimited with extras)', () => {
    test('should allow unlimited property creation', async () => {
      const orgId = 'test-org-789'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 50,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: { plan: 'premium' },
        error: null,
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.canCreate).toBe(true)
      expect(data.currentCount).toBe(50)
      expect(data.limit).toBeNull()
      expect(data.plan).toBe('premium')
    })
  })

  describe('Error handling', () => {
    test('should return 400 when org_id is missing', async () => {
      const request = new Request('http://localhost/api/properties/check-limit')

      const response = await GET(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing org_id')
    })

    test('should default to essencial when subscription not found', async () => {
      const orgId = 'test-org-new'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: 0,
        error: null,
      })

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.plan).toBe('essencial')
      expect(data.limit).toBe(10)
    })

    test('should return 500 on database error', async () => {
      const orgId = 'test-org-error'
      const request = new Request(`http://localhost/api/properties/check-limit?org_id=${orgId}`)

      mockSupabase.from().select().eq().is.mockResolvedValueOnce({
        count: null,
        error: { message: 'Database connection failed' },
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to fetch')
    })
  })
})
