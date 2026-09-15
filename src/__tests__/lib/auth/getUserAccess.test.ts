import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserAccess } from '@/lib/auth/getUserAccess'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => {
    throw new Error('getUserAccess must remain scoped to the authenticated client')
  }),
}))

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url: string | null
  access_all_properties: boolean
  organization_id: string
}

function buildAuthenticatedClient({
  profile,
  propertyIds = [],
}: {
  profile: Profile | null
  propertyIds?: string[]
}) {
  const profileSingle = jest.fn().mockResolvedValue({ data: profile, error: null })
  const profileChain = {
    select: jest.fn(() => profileChain),
    eq: jest.fn(() => profileChain),
    single: profileSingle,
    maybeSingle: profileSingle,
  }

  const propertyEq = jest.fn().mockResolvedValue({
    data: propertyIds.map(property_id => ({ property_id })),
    error: null,
  })
  const propertyChain = {
    select: jest.fn(() => propertyChain),
    eq: propertyEq,
  }

  const from = jest.fn((table: string) => {
    if (table === 'user_profiles') return profileChain
    if (table === 'user_properties') return propertyChain
    throw new Error(`Unexpected table: ${table}`)
  })

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'session@example.com' } },
        error: null,
      }),
    },
    from,
  } as unknown as SupabaseClient

  return { supabase, from, profileChain, propertyChain }
}

describe('getUserAccess', () => {
  it('loads an unrestricted admin through the authenticated RLS client', async () => {
    const { supabase, from } = buildAuthenticatedClient({
      profile: {
        id: 'user-123',
        email: 'profile@example.com',
        full_name: 'Admin User',
        role: 'admin',
        avatar_url: null,
        access_all_properties: true,
        organization_id: 'org-123',
      },
    })

    await expect(getUserAccess(supabase)).resolves.toEqual({
      profile: expect.objectContaining({
        id: 'user-123',
        email: 'session@example.com',
        role: 'admin',
        organization_id: 'org-123',
        access_all_properties: true,
      }),
      propertyIds: null,
    })
    expect(from).toHaveBeenCalledWith('user_profiles')
    expect(from).not.toHaveBeenCalledWith('user_properties')
  })

  it('loads assigned properties through the same authenticated RLS client', async () => {
    const { supabase, from, propertyChain } = buildAuthenticatedClient({
      profile: {
        id: 'user-123',
        email: 'profile@example.com',
        full_name: 'Gestor User',
        role: 'gestor',
        avatar_url: null,
        access_all_properties: false,
        organization_id: 'org-123',
      },
      propertyIds: ['property-1', 'property-2'],
    })

    await expect(getUserAccess(supabase)).resolves.toEqual({
      profile: expect.objectContaining({ role: 'gestor' }),
      propertyIds: ['property-1', 'property-2'],
    })
    expect(from).toHaveBeenCalledWith('user_properties')
    expect(propertyChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns null when the authenticated user has no RLS-visible profile', async () => {
    const { supabase } = buildAuthenticatedClient({ profile: null })

    await expect(getUserAccess(supabase)).resolves.toBeNull()
  })

  it('reuses a previously validated user without a second auth round-trip', async () => {
    const { supabase } = buildAuthenticatedClient({
      profile: {
        id: 'user-123',
        email: 'profile@example.com',
        full_name: 'Admin User',
        role: 'admin',
        avatar_url: null,
        access_all_properties: true,
        organization_id: 'org-123',
      },
    })

    await expect(getUserAccess(supabase, {
      id: 'user-123',
      email: 'session@example.com',
    })).resolves.toEqual(expect.objectContaining({ propertyIds: null }))
    expect(supabase.auth.getUser).not.toHaveBeenCalled()
  })

  it('propagates profile lookup failures instead of masking them as missing access', async () => {
    const { supabase, profileChain } = buildAuthenticatedClient({ profile: null })
    profileChain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST500', message: 'profile lookup failed' },
    })

    await expect(getUserAccess(supabase)).rejects.toMatchObject({ code: 'PGRST500' })
  })

  it('propagates property assignment lookup failures', async () => {
    const { supabase, propertyChain } = buildAuthenticatedClient({
      profile: {
        id: 'user-123',
        email: 'profile@example.com',
        full_name: 'Gestor User',
        role: 'gestor',
        avatar_url: null,
        access_all_properties: false,
        organization_id: 'org-123',
      },
    })
    propertyChain.eq.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST500', message: 'assignment lookup failed' },
    })

    await expect(getUserAccess(supabase)).rejects.toMatchObject({ code: 'PGRST500' })
  })
})
