import type { SupabaseClient, User } from '@supabase/supabase-js'

export type Role = 'admin' | 'manager' | 'gestor' | 'owner' | 'viewer'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  access_all_properties: boolean
  organization_id?: string
  phone_number?: string | null
  accepts_whatsapp?: boolean
}

export function getFallbackUserRole(role?: string | null): UserProfile['role'] {
  return role === 'admin' || role === 'gestor' ? role : 'viewer'
}

export interface UserAccess {
  profile: UserProfile
  propertyIds: string[] | null // null = no filter (admin / access_all_properties)
}

/**
 * Returns the user profile and, when needed, the accessible property IDs.
 * Returns null when no session exists — caller should redirect to /login.
 *
 * Used by Server Components to pass auth data to Client Components (AuthLayout, Header).
 * An already validated user may be supplied to avoid a duplicate Auth request.
 */
export async function getUserAccess(
  supabase: SupabaseClient,
  authenticatedUser?: Pick<User, 'id' | 'email'>,
): Promise<UserAccess | null> {
  const user = authenticatedUser ?? (await supabase.auth.getUser()).data.user
  if (!user) return null

  // Keep profile and assignment reads on the same authenticated client. Both
  // tables expose only the current user's rows through RLS, so switching to a
  // service-role client here would create a second, configuration-dependent
  // authorization boundary after the session has already been validated.
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, avatar_url, access_all_properties, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) return null

  const role = profile.access_all_properties === true
    ? 'admin'
    : ((profile.role as Role) || 'viewer')

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

  const { data: userProperties, error: userPropertiesError } = await supabase
    .from('user_properties')
    .select('property_id')
    .eq('user_id', user.id)

  if (userPropertiesError) throw userPropertiesError

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
