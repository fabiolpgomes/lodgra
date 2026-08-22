import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole, type Role } from '@/lib/auth/requireRole'

export interface PropertyAccessContext {
  auth: Awaited<ReturnType<typeof requireRole>>
  property: {
    id: string
    slug: string | null
    currency: string | null
    organization_id: string | null
  }
}

type PropertyAccessResult =
  | {
      authorized: true
      auth: Awaited<ReturnType<typeof requireRole>>
      property: PropertyAccessContext['property']
      response?: never
    }
  | {
      authorized: false
      response: NextResponse<any>
    }

export async function requirePropertyAccess(
  propertyId: string,
  allowedRoles: Role[] = ['admin', 'gestor', 'owner']
): Promise<PropertyAccessResult> {
  const auth = await requireRole(allowedRoles)
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
    .select('id, slug, currency, organization_id')
    .eq('id', propertyId)
    .eq('organization_id', auth.organizationId)
    .single()

  if (error || !property) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 }),
    }
  }

  return {
    authorized: true,
    auth,
    property,
  }
}
