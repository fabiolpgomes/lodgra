import { requireRole } from '../requireRole'

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock profile cache
jest.mock('@/lib/cache/profileCache', () => ({
  getCachedProfile: jest.fn(),
  setCachedProfile: jest.fn(),
  invalidateCachedProfile: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { getCachedProfile, setCachedProfile } from '@/lib/cache/profileCache'

const mockCreateClient = createClient as jest.Mock
const mockGetCachedProfile = getCachedProfile as jest.Mock
const mockSetCachedProfile = setCachedProfile as jest.Mock

function buildSupabaseMock(sessionUser: { id: string } | null, rpcProfile: object | null) {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: sessionUser ? { user: sessionUser } : null },
      }),
    },
    rpc: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({ data: rpcProfile }),
    }),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCachedProfile.mockResolvedValue(null) // cache miss por defeito
  mockSetCachedProfile.mockResolvedValue(undefined)
})

describe('requireRole — não autenticado', () => {
  it('returns 401 when no session exists', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock(null, null))

    const result = await requireRole(['admin'])

    expect(result.authorized).toBe(false)
    expect(result.response?.status).toBe(401)
  })
})

describe('requireRole — role insuficiente', () => {
  it('returns 403 when viewer requests admin-only route', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-1' }, null))
    mockGetCachedProfile.mockResolvedValue({
      role: 'viewer',
      access_all_properties: false,
      organization_id: 'org-1',
    })

    const result = await requireRole(['admin', 'gestor'])

    expect(result.authorized).toBe(false)
    expect(result.response?.status).toBe(403)
    expect(result.role).toBe('viewer')
  })
})

describe('requireRole — autorizado', () => {
  it('authorizes admin on admin-only route', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-admin' }, null))
    mockGetCachedProfile.mockResolvedValue({
      role: 'admin',
      access_all_properties: true,
      organization_id: 'org-1',
    })

    const result = await requireRole(['admin'])

    expect(result.authorized).toBe(true)
    expect(result.role).toBe('admin')
    expect(result.userId).toBe('user-admin')
    expect(result.organizationId).toBe('org-1')
  })

  it('authorizes manager on admin+manager route', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-mgr' }, null))
    mockGetCachedProfile.mockResolvedValue({
      role: 'gestor',
      access_all_properties: false,
      organization_id: 'org-2',
    })

    const result = await requireRole(['admin', 'gestor'])

    expect(result.authorized).toBe(true)
    expect(result.role).toBe('gestor')
  })
})

describe('requireRole — org isolation', () => {
  it('returns organizationId from cached profile', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-1' }, null))
    mockGetCachedProfile.mockResolvedValue({
      role: 'admin',
      access_all_properties: true,
      organization_id: 'org-abc',
    })

    const result = await requireRole(['admin'])

    expect(result.organizationId).toBe('org-abc')
  })

  it('fetches from DB on cache miss and caches result', async () => {
    const dbProfile = {
      user_id: 'user-1',
      role: 'admin',
      access_all_properties: true,
      organization_id: 'org-xyz',
    }
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-1' }, dbProfile))
    mockGetCachedProfile.mockResolvedValue(null) // cache miss

    const result = await requireRole(['admin'])

    expect(result.authorized).toBe(true)
    expect(result.organizationId).toBe('org-xyz')
    expect(mockSetCachedProfile).toHaveBeenCalledWith('user-1', expect.objectContaining({
      role: 'admin',
      organization_id: 'org-xyz',
    }))
  })

  it('returns 401 when DB profile is missing (invalid JWT)', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock({ id: 'user-1' }, null))
    mockGetCachedProfile.mockResolvedValue(null)

    const result = await requireRole(['admin'])

    expect(result.authorized).toBe(false)
    expect(result.response?.status).toBe(401)
  })
})
