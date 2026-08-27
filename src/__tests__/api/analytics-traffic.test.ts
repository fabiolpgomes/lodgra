import { POST } from '@/app/api/analytics/traffic/route'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin')

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('POST /api/analytics/traffic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'org-1', slug: 'villa' },
                  error: null,
                }),
              }),
            }),
          }
        }

        if (table === 'organization_traffic_events') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          }
        }

        return {}
      }),
    } as ReturnType<typeof createAdminClient>)
  })

  it('stores a traffic event for a known organization slug', async () => {
    const request = new Request('http://localhost:3000/api/analytics/traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Jest' },
      body: JSON.stringify({
        organization_slug: 'villa',
        path: '/p/villa',
        hostname: 'villa.lodgra.io',
      }),
    })

    const response = await POST(request as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('rejects missing organization slug', async () => {
    const request = new Request('http://localhost:3000/api/analytics/traffic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/p/villa' }),
    })

    const response = await POST(request as never)

    expect(response.status).toBe(400)
  })
})

