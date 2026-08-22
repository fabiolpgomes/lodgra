import { requirePropertyOwner } from '../requirePropertyOwner'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('../requireRole', () => ({
  requireRole: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '../requireRole'

const mockCreateClient = createClient as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock
const mockRequireRole = requireRole as jest.Mock

function buildAdminMock({
  property,
  owner,
}: {
  property: { id: string; slug: string | null; currency: string | null; owner_id: string | null } | null
  owner?: { user_id: string } | null
}) {
  const propertyChain = {
    select: jest.fn(() => propertyChain),
    eq: jest.fn(() => propertyChain),
    single: jest.fn().mockResolvedValue(
      property
        ? { data: property, error: null }
        : { data: null, error: { code: 'PGRST116' } }
    ),
  }

  const ownerChain = {
    select: jest.fn(() => ownerChain),
    eq: jest.fn(() => ownerChain),
    single: jest.fn().mockResolvedValue(
      owner
        ? { data: owner, error: null }
        : { data: null, error: { code: 'PGRST116' } }
    ),
  }

  const admin = {
    from: jest.fn((table: string) => {
      if (table === 'properties') return propertyChain
      if (table === 'owners') return ownerChain
      throw new Error(`Unexpected table: ${table}`)
    }),
  }

  mockCreateAdminClient.mockReturnValue(admin)

  return { admin, propertyChain, ownerChain }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequireRole.mockResolvedValue({
    authorized: false,
    response: { status: 403 },
  })
})

describe('requirePropertyOwner', () => {
  it('authorizes admin users with full operational access', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-user', email: 'admin@example.com' } },
          error: null,
        }),
      },
    })
    mockRequireRole.mockResolvedValue({
      authorized: true,
      userId: 'admin-user',
      role: 'admin',
      accessAllProperties: true,
    })

    const { ownerChain } = buildAdminMock({
      property: {
        id: 'prop-1',
        slug: 'test-property',
        currency: 'EUR',
        owner_id: 'owner-999',
      },
    })

    const result = await requirePropertyOwner('prop-1')

    expect(result.authorized).toBe(true)
    expect(result.property.id).toBe('prop-1')
    expect(ownerChain.single).not.toHaveBeenCalled()
  })

  it('authorizes the property owner via owners.user_id mapping', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'owner@example.com' } },
          error: null,
        }),
      },
    })
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: { status: 403 },
    })

    buildAdminMock({
      property: {
        id: 'prop-2',
        slug: 'owner-property',
        currency: 'EUR',
        owner_id: 'owner-abc',
      },
      owner: { user_id: 'user-123' },
    })

    const result = await requirePropertyOwner('prop-2')

    expect(result.authorized).toBe(true)
    expect(result.property.slug).toBe('owner-property')
  })

  it('authorizes direct owner_id matches as a fallback', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-direct', email: 'direct@example.com' } },
          error: null,
        }),
      },
    })
    mockRequireRole.mockResolvedValue({
      authorized: false,
      response: { status: 403 },
    })

    const { ownerChain } = buildAdminMock({
      property: {
        id: 'prop-3',
        slug: 'direct-property',
        currency: 'EUR',
        owner_id: 'user-direct',
      },
    })

    const result = await requirePropertyOwner('prop-3')

    expect(result.authorized).toBe(true)
    expect(result.property.owner_id).toBe('user-direct')
    expect(ownerChain.single).not.toHaveBeenCalled()
  })
})
