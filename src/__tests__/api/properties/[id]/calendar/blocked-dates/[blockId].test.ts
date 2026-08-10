import { DELETE } from '@/app/api/properties/[id]/calendar/blocked-dates/[blockId]/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('DELETE /api/properties/[id]/calendar/blocked-dates/[blockId]', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    }

    mockCreateClient.mockResolvedValue(mockSupabase)
  })

  describe('Success Cases', () => {
    it('deletes block successfully when authorized', async () => {
      const userId = 'user-123'
      const orgId = 'org-456'
      const blockId = 'block-789'
      const propertyId = 'prop-101'

      // Setup auth
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      })

      // Setup profile query
      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: orgId },
          error: null,
        }),
      }

      // Setup block query
      const blockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: blockId,
            property_id: propertyId,
            organization_id: orgId,
            start_date: '2026-08-10',
            end_date: '2026-08-12',
            notes: 'Maintenance',
          },
          error: null,
        }),
      }

      // Setup delete query
      const deleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(blockQuery)
        .mockReturnValueOnce(deleteQuery)

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: propertyId, blockId }),
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(blockId)
      expect(data.data.start_date).toBe('2026-08-10')
    })
  })

  describe('Authentication Errors', () => {
    it('returns 401 when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      })

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'block-789' }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Unauthorized')
    })

    it('returns 403 when user profile not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile not found'),
        }),
      }

      mockSupabase.from.mockReturnValueOnce(profileQuery)

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'block-789' }),
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('User profile not found')
    })
  })

  describe('Authorization Errors', () => {
    it('returns 404 when block not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 'org-456' },
          error: null,
        }),
      }

      const blockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Block not found'),
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(blockQuery)

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/nonexistent', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'nonexistent' }),
      })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('Block not found')
    })

    it('returns 403 when org does not match', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 'org-456' },
          error: null,
        }),
      }

      const blockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'block-789',
            property_id: 'prop-101',
            organization_id: 'org-999', // Different org
            start_date: '2026-08-10',
            end_date: '2026-08-12',
            notes: 'Maintenance',
          },
          error: null,
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(blockQuery)

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'block-789' }),
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('permission')
    })
  })

  describe('Server Errors', () => {
    it('returns 500 when delete fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const profileQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 'org-456' },
          error: null,
        }),
      }

      const blockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'block-789',
            property_id: 'prop-101',
            organization_id: 'org-456',
            start_date: '2026-08-10',
            end_date: '2026-08-12',
            notes: 'Maintenance',
          },
          error: null,
        }),
      }

      const deleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      }

      mockSupabase.from
        .mockReturnValueOnce(profileQuery)
        .mockReturnValueOnce(blockQuery)
        .mockReturnValueOnce(deleteQuery)

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'block-789' }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to delete block')
    })

    it('returns 500 on uncaught exception', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/properties/prop-101/calendar/blocked-dates/block-789', {
        method: 'DELETE',
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'prop-101', blockId: 'block-789' }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Server error')
    })
  })
})
