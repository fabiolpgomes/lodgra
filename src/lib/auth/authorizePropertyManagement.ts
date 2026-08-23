import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, type Role } from '@/lib/auth/requireRole'

type PropertyRecord = {
  id: string
  slug: string | null
  organization_id: string | null
  currency: string | null
}

type AuthorizationResult =
  | {
      authorized: true
      admin: Awaited<ReturnType<typeof createAdminClient>>
      property: PropertyRecord
      auth: Awaited<ReturnType<typeof requireRole>>
      response?: NextResponse
    }
  | {
      authorized: false
      response: NextResponse
    }

/**
 * Authorizes access to a property management endpoint.
 *
 * Primary rule: the authenticated user must have a management role and the
 * property must belong to the user's organization.
 *
 * The current data model guarantees `properties.organization_id`, so this
 * helper intentionally uses organization scope only. That keeps the rule
 * simple and avoids mixed ownership semantics.
 */
export async function authorizePropertyManagement(
  propertyId: string,
  minimumRoles: Role[] = ['admin', 'gestor', 'manager', 'owner']
): Promise<AuthorizationResult> {
  const auth = await requireRole(minimumRoles)
  if (!auth.authorized) {
    return { authorized: false, response: auth.response }
  }

  if (!auth.organizationId) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Organization not found' }, { status: 400 }),
    }
  }

  const admin = createAdminClient()

  const { data: property, error } = await admin
    .from('properties')
    .select('id, slug, organization_id, currency')
    .eq('id', propertyId)
    .maybeSingle()

  if (error) {
    console.error('[authorizePropertyManagement] Property fetch failed:', error)
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Failed to load property' }, { status: 500 }),
    }
  }

  if (!property) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 }),
    }
  }

  if (property.organization_id === auth.organizationId) {
    return { authorized: true, admin, auth, property }
  }

  return {
    authorized: false,
    response: NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 }),
  }
}
