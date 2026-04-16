/**
 * Integration Tests for POST /api/properties/[id]/ical-token
 * Tests iCal token regeneration with authentication and org isolation
 */

import { POST } from '@/app/api/properties/[id]/ical-token/route'
import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

// Mock dependencies
jest.mock('@/lib/auth/requireRole')
jest.mock('@/lib/supabase/admin')
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'new-token-uuid-123'),
}))

const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('POST /api/properties/[id]/ical-token', () => {
  const propertyId = 'prop-123'
  const organizationId = 'org-456'
  const oldToken = 'old-token-abc'
  const newToken = 'new-token-uuid-123'

  const mockSupabaseClient = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateAdminClient.mockReturnValue(mockSupabaseClient as never)
  })

  // Test 1: Successfully regenerate token for authorized admin
  it('should regenerate token for authorized admin user', async () => {
    // Mock auth check - user is admin
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-123',
      role: 'admin',
      accessAllProperties: true,
      organizationId,
      response: null,
    })

    // Mock property lookup
    const mockProperty = {
      id: propertyId,
      organization_id: organizationId,
      ical_export_token: oldToken,
    }

    // Mock Supabase response for update
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperty,
              error: null,
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ical_export_token: newToken },
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    // Create request
    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    // Execute
    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    // Verify response
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ical_export_token).toBe(newToken)
  })

  // Test 2: Successfully regenerate token for authorized manager
  it('should regenerate token for authorized manager user', async () => {
    // Mock auth check - user is manager
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-456',
      role: 'gestor',
      accessAllProperties: false,
      organizationId,
      response: null,
    })

    // Mock property lookup
    const mockProperty = {
      id: propertyId,
      organization_id: organizationId,
      ical_export_token: oldToken,
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperty,
              error: null,
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ical_export_token: newToken },
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ical_export_token).toBe(newToken)
  })

  // Test 3: Reject unauthorized user (viewer role)
  it('should return 403 for unauthorized viewer user', async () => {
    // Mock auth check - authorization fails
    const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    mockRequireRole.mockResolvedValue({
      authorized: false,
      userId: undefined,
      role: undefined,
      accessAllProperties: false,
      organizationId: undefined,
      response: unauthorizedResponse,
    })

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(403)
    expect(mockRequireRole).toHaveBeenCalledWith(['admin', 'gestor'])
  })

  // Test 4: Reject unauthenticated user
  it('should return 401 for unauthenticated request', async () => {
    // Mock auth check - user not authenticated
    const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    mockRequireRole.mockResolvedValue({
      authorized: false,
      userId: undefined,
      role: undefined,
      accessAllProperties: false,
      organizationId: undefined,
      response: unauthorizedResponse,
    })

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(401)
  })

  // Test 5: Enforce organization isolation (user cannot access other org property)
  it('should return 404 when user accesses property from different organization', async () => {
    // Mock auth check - user is admin but in different org
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-789',
      role: 'admin',
      accessAllProperties: true,
      organizationId: 'org-different', // Different organization
      response: null,
    })

    // Mock property lookup - returns null (different org)
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null, // Property not found in this org
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Property not found')
  })

  // Test 6: New token is different from old token
  it('should generate a different token from the previous one', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-123',
      role: 'admin',
      accessAllProperties: true,
      organizationId,
      response: null,
    })

    const mockProperty = {
      id: propertyId,
      organization_id: organizationId,
      ical_export_token: oldToken,
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProperty,
              error: null,
            }),
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ical_export_token: newToken },
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    const data = await response.json()
    expect(data.ical_export_token).not.toBe(oldToken)
    expect(data.ical_export_token).toBe(newToken)
  })

  // Test 7: Database error returns 500
  it('should return 500 when database update fails', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-123',
      role: 'admin',
      accessAllProperties: true,
      organizationId,
      response: null,
    })

    const mockProperty = {
      id: propertyId,
      organization_id: organizationId,
      ical_export_token: oldToken,
    }

    // Mock lookup succeeds, but update fails
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockProperty,
                  error: null,
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database constraint violation' },
                }),
              }),
            }),
          }),
        }
      }
      return undefined
    })

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Database constraint violation')
  })

  // Test 8: Non-existent property returns 404
  it('should return 404 when property does not exist in user\'s organization', async () => {
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-123',
      role: 'admin',
      accessAllProperties: true,
      organizationId,
      response: null,
    })

    // Mock property not found
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    } as never)

    const request = new Request('http://localhost:3000/api/properties/prop-123/ical-token', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: propertyId }) })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Property not found')
  })
})
