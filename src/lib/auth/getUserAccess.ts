import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export type Role = 'admin' | 'gestor' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  access_all_properties: boolean
  organization_id?: string
}

export interface UserAccess {
  profile: UserProfile
  propertyIds: string[] | null // null = no filter (admin / access_all_properties)
}

/**
 * Returns user profile and accessible property IDs in a single DB call.
 * Returns null when no session exists — caller should redirect to /login.
 *
 * Used by Server Components to pass auth data to Client Components (AuthLayout, Header).
 * Eliminates race conditions from client-side auth checks.
 */
export async function getUserAccess(
  supabase: SupabaseClient
): Promise<UserAccess | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, email, full_name, role, avatar_url, access_all_properties, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const role = (profile.role as Role) || 'viewer'

  if (role === 'admin' || profile.access_all_properties === true) {
    return {
      profile: {
        id: profile.id,
        email: user.email || '',
        full_name: profile.full_name,
        role,
        avatar_url: profile.avatar_url,
        access_all_properties: true,
        organization_id: profile.organization_id,
      },
      propertyIds: null
    }
  }

  const { data: userProperties } = await adminClient
    .from('user_properties')
    .select('property_id')
    .eq('user_id', user.id)

  return {
    profile: {
      id: profile.id,
      email: user.email || '',
      full_name: profile.full_name,
      role,
      avatar_url: profile.avatar_url,
      access_all_properties: false,
      organization_id: profile.organization_id,
    },
    propertyIds: userProperties?.map(up => up.property_id) ?? [],
  }
}
