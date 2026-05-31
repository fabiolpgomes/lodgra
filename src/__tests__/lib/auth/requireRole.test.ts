import { requireRole } from '@/lib/auth/requireRole'

// jest.mock is hoisted — cannot reference variables declared outside it.
// We use module-level spies set up in beforeEach instead.
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/cache/profileCache', () => ({
  getCachedProfile: jest.fn().mockResolvedValue(null),
  setCachedProfile: jest.fn().mockResolvedValue(undefined),
  invalidateCachedProfile: jest.fn().mockResolvedValue(undefined),
}))

import { createClient } from '@/lib/supabase/server'

const MOCK_SESSION = {
  user: { id: 'user-123' },
  access_token: 'token',
}

const MOCK_PROFILE_ADMIN = {
  user_id: 'user-123',
  role: 'admin',
  access_all_properties: true,
  organization_id: 'org-abc',
}

const MOCK_PROFILE_VIEWER = {
  user_id: 'user-123',
  role: 'viewer',
  access_all_properties: false,
  organization_id: 'org-abc',
}

function setupSupabase(session: typeof MOCK_SESSION | null, profile: typeof MOCK_PROFILE_ADMIN | null) {
  const mockMaybeSingle = jest.fn().mockResolvedValue({ data: profile })
  const mockRpc = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
  const mockGetSession = jest.fn().mockResolvedValue({ data: { session } })

  ;(createClient as jest.Mock).mockResolvedValue({
    auth: { getSession: mockGetSession },
    rpc: mockRpc,
  })

  return { mockGetSession, mockRpc, mockMaybeSingle }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('requireRole()', () => {
  describe('unauthenticated — no session', () => {
    it('returns 401 when session is null', async () => {
      setupSupabase(null, null)

      const result = await requireRole(['admin'])

      expect(result.authorized).toBe(false)
      expect(result.response?.status).toBe(401)
    })
  })

  describe('unauthenticated — no profile', () => {
    it('returns 401 when profile RPC returns null', async () => {
      setupSupabase(MOCK_SESSION, null)

      const result = await requireRole(['admin'])

      expect(result.authorized).toBe(false)
      expect(result.response?.status).toBe(401)
    })
  })

  describe('authorized user', () => {
    it('returns authorized=true for admin requesting admin role', async () => {
      setupSupabase(MOCK_SESSION, MOCK_PROFILE_ADMIN)

      const result = await requireRole(['admin'])

      expect(result.authorized).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.role).toBe('admin')
      expect(result.organizationId).toBe('org-abc')
      expect(result.response).toBeUndefined()
    })

    it('returns authorized=true for admin requesting admin OR manager', async () => {
      setupSupabase(MOCK_SESSION, MOCK_PROFILE_ADMIN)

      const result = await requireRole(['admin', 'gestor'])

      expect(result.authorized).toBe(true)
      expect(result.role).toBe('admin')
    })
  })

  describe('insufficient role', () => {
    it('returns 403 when viewer requests admin-only route', async () => {
      setupSupabase(MOCK_SESSION, MOCK_PROFILE_VIEWER)

      const result = await requireRole(['admin'])

      expect(result.authorized).toBe(false)
      expect(result.response?.status).toBe(403)
      expect(result.role).toBe('viewer')
    })

    it('returns 403 when viewer requests manager role', async () => {
      setupSupabase(MOCK_SESSION, MOCK_PROFILE_VIEWER)

      const result = await requireRole(['admin', 'gestor'])

      expect(result.authorized).toBe(false)
      expect(result.response?.status).toBe(403)
    })
  })

  describe('organization isolation', () => {
    it('returns organizationId from profile', async () => {
      setupSupabase(MOCK_SESSION, { ...MOCK_PROFILE_ADMIN, organization_id: 'org-xyz' })

      const result = await requireRole(['admin'])

      expect(result.organizationId).toBe('org-xyz')
    })

    it('returns undefined organizationId when profile has null org', async () => {
      setupSupabase(MOCK_SESSION, { ...MOCK_PROFILE_ADMIN, organization_id: null as unknown as string })

      const result = await requireRole(['admin'])

      expect(result.organizationId).toBeUndefined()
    })
  })
})
