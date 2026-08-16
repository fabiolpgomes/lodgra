import { GET } from '@/app/api/email/status/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(),
}))

jest.mock('@/lib/email-parser/crypto', () => ({
  decryptToken: jest.fn((value: string) => {
    if (value === 'valid-refresh-token') return 'refresh-token'
    throw new Error('Token encriptado inválido')
  }),
}))

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockRequireRole = requireRole as jest.MockedFunction<typeof requireRole>

function createSupabaseMock(connection: Record<string, unknown> | null) {
  const single = jest.fn().mockResolvedValue({
    data: connection,
    error: connection ? null : new Error('Not found'),
  })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  const from = jest.fn().mockReturnValue({ select })

  return { from }
}

describe('GET /api/email/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'user-1',
      role: 'admin',
      organizationId: 'org-1',
    } as never)
  })

  it('keeps the Gmail connection connected when a usable refresh token exists', async () => {
    const connection = {
      email: 'fabiolpgomes@gmail.com',
      token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      last_sync_at: null,
      connected_at: new Date().toISOString(),
      refresh_token: 'valid-refresh-token',
    }

    mockCreateAdminClient.mockResolvedValue(createSupabaseMock(connection) as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('connected')
    expect(data.warning).toBeNull()
    expect(data.autoRefreshEnabled).toBe(true)
    expect(data.needsReconnection).toBe(false)
  })

  it('still warns when there is no usable refresh token and the access token is near expiry', async () => {
    const connection = {
      email: 'fabiolpgomes@gmail.com',
      token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      last_sync_at: null,
      connected_at: new Date().toISOString(),
      refresh_token: '',
    }

    mockCreateAdminClient.mockResolvedValue(createSupabaseMock(connection) as never)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('expiring_soon')
    expect(data.warning).toBe('Token expira em 1h')
    expect(data.autoRefreshEnabled).toBe(false)
    expect(data.needsReconnection).toBe(false)
  })
})
