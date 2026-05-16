import { POST } from '@/app/api/admin/google-feed/refresh/route'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Helper to create a Request-like object for testing
function createMockRequest(body: any = {}): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/admin/google-feed/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('should return 401 if user not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if user profile not found', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('User profile not found')
    })

    it('should return 403 if user has no premium properties', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue({
                    then: jest.fn((callback) =>
                      callback({ data: [], error: null })
                    ),
                  }),
                })),
              })),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Premium tier required')
    })
  })

  describe('Request Handling', () => {
    it('should accept optional propertyIds parameter', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ propertyIds: ['uuid1', 'uuid2'] })

      const response = await POST(request)
      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.propertiesCount).toBe(2)
      expect(data.allProperties).toBe(false)
    })

    it('should handle empty body gracefully', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(202)
      const data = await response.json()
      expect(data.status).toBe('queued')
      expect(data.allProperties).toBe(true)
    })
  })

  describe('Response Format', () => {
    it('should return 202 Accepted status', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(202)
    })

    it('should return jobId in response', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()
      expect(data.jobId).toBeDefined()
      expect(typeof data.jobId).toBe('string')
      expect(data.jobId.length).toBeGreaterThan(0)
    })

    it('should return status="queued" for new refresh', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()
      expect(data.status).toBe('queued')
    })

    it('should return timestamp in ISO format', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()
      expect(data.timestamp).toBeDefined()
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.timestamp)).toBe(true)
    })

    it('should return propertiesCount matching input', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: null }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ propertyIds: ['id1', 'id2', 'id3'] })

      const response = await POST(request)
      const data = await response.json()
      expect(data.propertiesCount).toBe(3)
    })
  })

  describe('Database Logging', () => {
    it('should create google_feed_logs entry with status=queued', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return { insert: insertMock }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      await POST(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
        })
      )
    })

    it('should log action as "manual" for user-triggered refresh', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return { insert: insertMock }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      await POST(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'manual',
        })
      )
    })

    it('should include properties_count in log entry', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return { insert: insertMock }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({ propertyIds: ['id1', 'id2'] })

      await POST(request)

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          properties_count: 2,
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return 500 if feed log creation fails', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: [{ id: 'prop-1' }], error: null })
                  ),
                })),
              })),
            }
          }
          if (table === 'google_feed_logs') {
            return {
              insert: jest.fn().mockResolvedValue({ error: new Error('DB error') }),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('queue refresh job')
    })

    it('should return 400 if property fetch fails', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn((table) => {
          if (table === 'user_profiles') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: { organization_id: 'org-123' },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'properties') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn(() => ({
                  limit: jest.fn().mockReturnValue(
                    Promise.resolve({ data: null, error: new Error('DB error') })
                  ),
                })),
              })),
            }
          }
        }),
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch properties')
    })

    it('should include error message in response', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      }
      mockCreateClient.mockResolvedValue(mockSupabase as any)

      const request = createMockRequest({})

      const response = await POST(request)
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })
  })
})
