import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  // Only admin and gestor can toggle status
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { is_active } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: is_active must be a boolean' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify property belongs to the organization
    const { data: property, error: fetchError } = await adminClient
      .from('properties')
      .select('id, organization_id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId!)
      .single()

    if (fetchError || !property) {
      return NextResponse.json(
        { error: 'Property not found or access denied' },
        { status: 404 }
      )
    }

    // Update the property status
    const { error: updateError } = await adminClient
      .from('properties')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId!)

    if (updateError) {
      console.error('Error updating property status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update property status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, is_active })
  } catch (error) {
    console.error('Toggle property status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
