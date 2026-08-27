import { GET } from '@/app/api/cron/cleanup/route'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/supabase/admin')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function makeCountChain(count: number) {
  return {
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockResolvedValue({ count, error: null }),
  }
}

function makeMutationChain(rows: Array<{ id: string }>) {
  return {
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data: rows, error: null }),
  }
}

function makeSupabaseClient() {
  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'reservations') {
        return {
          select: jest.fn().mockReturnValue(makeCountChain(4)),
        }
      }
      return {}
    }),
  }
}

function makeAdminClient() {
  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'reservations') {
        return {
          update: jest.fn().mockReturnValue(makeMutationChain([{ id: 'res-1' }, { id: 'res-2' }])),
        }
      }

      if (table === 'email_sent') {
        return {
          delete: jest.fn().mockReturnValue(makeMutationChain([{ id: 'email-1' }, { id: 'email-2' }])),
        }
      }

      if (table === 'email_unsubscribes') {
        return {
          delete: jest.fn().mockReturnValue(makeMutationChain([{ id: 'unsub-1' }])),
        }
      }

      return {}
    }),
  }
}

describe('GET /api/cron/cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    mockCreateClient.mockResolvedValue(
      makeSupabaseClient() as Awaited<ReturnType<typeof createClient>>,
    )
    mockCreateAdminClient.mockReturnValue(makeAdminClient() as ReturnType<typeof createAdminClient>)
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('cleans up expired email records alongside reservation maintenance', async () => {
    const request = new Request('http://localhost:3000/api/cron/cleanup', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer test-secret',
      },
    })

    const response = await GET(request as any)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.oldEmailSentDeleted).toBe(2)
    expect(json.oldUnsubscribesDeleted).toBe(1)
    expect(json.action).toBe('counted-and-cleaned')
  })

  it('rejects requests without the cron secret', async () => {
    const request = new Request('http://localhost:3000/api/cron/cleanup', {
      method: 'GET',
      headers: {},
    })

    const response = await GET(request as any)

    expect(response.status).toBe(401)
  })
})
