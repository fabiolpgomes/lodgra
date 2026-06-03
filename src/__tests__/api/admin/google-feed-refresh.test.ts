import { POST } from '@/app/api/admin/google-feed/refresh/route'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/feeds/google-feed-generator')

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function createMockRequest(body: Record<string, unknown> = {}): Request {
  return {
    json: async () => body,
  } as unknown as Request
}

describe('POST /api/admin/google-feed/refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if user not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    }
    mockCreateClient.mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 if user profile not found', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: null, error: new Error('Not found') }),
          }),
        }),
      }),
    }
    mockCreateClient.mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)

    const response = await POST(createMockRequest({}))
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('User profile not found')
  })
})
