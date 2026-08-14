import { GET } from '@/app/api/cron/email-parser/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const CRON_SECRET = 'test-cron-secret'

describe('GET /api/cron/email-parser authentication', () => {
  const originalCronSecret = process.env.CRON_SECRET
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
  })

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalCronSecret

    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey
  })

  it('rejects requests without a cron credential', async () => {
    const response = await GET(createTestRequest('http://localhost/api/cron/email-parser'))

    expect(response.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects an invalid query secret', async () => {
    const response = await GET(
      createTestRequest('http://localhost/api/cron/email-parser?secret=wrong-secret')
    )

    expect(response.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('accepts a valid Bearer header', async () => {
    const emailConnectionsQuery = {
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }
    ;(createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => emailConnectionsQuery),
    })

    const response = await GET(createTestRequest('http://localhost/api/cron/email-parser', {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe('Sem ligações Gmail activas')
  })
})
