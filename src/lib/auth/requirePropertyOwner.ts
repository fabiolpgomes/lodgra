import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

export interface PropertyOwnershipContext {
  user: {
    id: string
    email?: string | null
  }
  property: {
    id: string
    slug: string | null
    currency: string | null
    owner_id: string | null
  }
}

type PropertyOwnershipResult =
  | {
      authorized: true
      user: PropertyOwnershipContext['user']
      property: PropertyOwnershipContext['property']
      response?: NextResponse<any>
    }
  | {
      authorized: false
      response: NextResponse<any>
    }

export async function requirePropertyOwner(propertyId: string): Promise<PropertyOwnershipResult> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const admin = createAdminClient()

  const roleAccess = await requireRole(['admin', 'gestor'])

  const { data: property, error: propertyError } = await admin
    .from('properties')
    .select('id, slug, currency, owner_id')
    .eq('id', propertyId)
    .single()

  if (propertyError || !property) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Property not found' }, { status: 404 }),
    }
  }

  if (!property.owner_id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  if (roleAccess.authorized || property.owner_id === user.id) {
    return {
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
      },
      property,
    }
  }

  const { data: owner, error: ownerError } = await admin
    .from('owners')
    .select('user_id')
    .eq('id', property.owner_id)
    .single()

  if (ownerError || !owner || owner.user_id !== user.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email,
    },
    property,
  }
}
