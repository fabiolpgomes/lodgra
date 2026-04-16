import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: listingId } = await params
    const body = await request.json()
    const { ical_url, sync_enabled } = body

    if (typeof ical_url !== 'string' && ical_url !== undefined && ical_url !== null) {
      return NextResponse.json({ error: 'Invalid ical_url' }, { status: 400 })
    }

    if (typeof sync_enabled !== 'boolean' && sync_enabled !== undefined && sync_enabled !== null) {
      return NextResponse.json({ error: 'Invalid sync_enabled' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify listing belongs to user's organization
    const { data: listing } = await supabase
      .from('property_listings')
      .select('id, properties!inner(organization_id)')
      .eq('id', listingId)
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    const listingOrgId = (listing.properties as unknown as { organization_id: string }).organization_id
    if (listingOrgId !== auth.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (ical_url !== undefined) updateData.ical_url = ical_url
    if (sync_enabled !== undefined) updateData.sync_enabled = sync_enabled

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('property_listings')
      .update(updateData)
      .eq('id', listingId)
      .select('id, ical_url, sync_enabled, is_active')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[property-listings] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
