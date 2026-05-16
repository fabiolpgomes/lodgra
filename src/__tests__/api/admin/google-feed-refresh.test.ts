import { POST } from '@/app/api/admin/google-feed/refresh/route'

jest.mock('@/lib/supabase/server')

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function createMockRequest(body: any = {}): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/admin/google-feed/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(401)
  })

  it('should return 400 if user profile not found', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
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
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(400)
  })

  it('should return 403 if no premium properties', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        }
      }),
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(403)
  })

  it('should return 202 Accepted on success', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'prop-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'google_feed_logs') {
          return { insert: insertMock }
        }
        return {}
      }),
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(202)
    const data = await response.json()
    expect(data.jobId).toBeDefined()
    expect(data.status).toBe('queued')
    expect(data.timestamp).toBeDefined()
  })

  it('should accept propertyIds parameter', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'prop-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'google_feed_logs') {
          return { insert: insertMock }
        }
        return {}
      }),
    } as any)

    const response = await POST(
      createMockRequest({ propertyIds: ['prop-1', 'prop-2'] })
    )
    expect(response.status).toBe(202)
    const data = await response.json()
    expect(data.propertiesCount).toBe(2)
    expect(data.allProperties).toBe(false)
  })

  it('should set allProperties=true when no propertyIds provided', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'prop-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'google_feed_logs') {
          return { insert: insertMock }
        }
        return {}
      }),
    } as any)

    const response = await POST(createMockRequest({}))
    const data = await response.json()
    expect(data.allProperties).toBe(true)
  })

  it('should log with correct action and status', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'prop-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'google_feed_logs') {
          return { insert: insertMock }
        }
        return {}
      }),
    } as any)

    await POST(createMockRequest({}))

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'manual',
        status: 'queued',
        properties_count: expect.any(Number),
      })
    )
  })

  it('should return 500 if log insertion fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: [{ id: 'prop-1' }],
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'google_feed_logs') {
          return { insert: jest.fn().mockResolvedValue({ error: new Error('DB error') }) }
        }
        return {}
      }),
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(500)
  })

  it('should return 400 if property fetch fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: { organization_id: 'org-1' },
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
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('DB error'),
                }),
              })),
            })),
          }
        }
        return {}
      }),
    } as any)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(400)
  })

  it('should include error message in response', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any)

    const response = await POST(createMockRequest({}))
    const data = await response.json()
    expect(data.error).toBeDefined()
    expect(typeof data.error).toBe('string')
  })
})
