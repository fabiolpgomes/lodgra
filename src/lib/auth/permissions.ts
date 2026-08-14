export interface RoleAccessProfile {
  role: string | null | undefined
  access_all_properties?: boolean | null
}

/**
 * A gestor with organization-wide property access is a senior manager and has
 * operational access equivalent to an admin, except for user administration.
 */
export function isRestrictedGestor(profile: RoleAccessProfile | null | undefined): boolean {
  return profile?.role === 'gestor' && profile.access_all_properties !== true
}

export function hasFullOperationalAccess(profile: RoleAccessProfile | null | undefined): boolean {
  return profile?.role === 'admin' || (profile?.role === 'gestor' && profile.access_all_properties === true)
}
