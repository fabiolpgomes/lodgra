import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileExtraProperties } from '@/lib/billing/extra-properties'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  // Only admin can delete properties
  const auth = await requireRole(['admin'])
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  try {
    const adminClient = await createAdminClient()

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

    // Delete the property (cascading deletes will handle related records via ON DELETE CASCADE)
    const { error: deleteError } = await adminClient
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId!)

    if (deleteError) {
      console.error('Error deleting property:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete property' },
        { status: 500 }
      )
    }

    // Menos propriedades → reduz as adicionais cobradas na assinatura
    const extras = await reconcileExtraProperties(auth.organizationId)
    if (!extras.ok) console.error('[delete property] Falha ao ajustar propriedades adicionais', extras.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete property error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
