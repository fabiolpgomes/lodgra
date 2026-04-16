import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { is_public } = body

    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: is_public must be a boolean' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify property belongs to the organization
    const { data: property, error: fetchError } = await adminClient
      .from('properties')
      .select('id, slug, organization_id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (fetchError || !property) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      )
    }

    // Update is_public
    const { error: updateError } = await adminClient
      .from('properties')
      .update({
        is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)

    if (updateError) {
      console.error('Error updating property visibility:', updateError)
      return NextResponse.json(
        { error: 'Failed to update property visibility' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.homestay.pt'
    return NextResponse.json({
      success: true,
      is_public,
      public_url: is_public && property.slug ? `${baseUrl}/p/${property.slug}` : null,
    })
  } catch (error) {
    console.error('Toggle property visibility error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
