import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('property_amenities')
    .select('amenity_id')
    .eq('property_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map(r => r.amenity_id))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const body = await req.json()

  if (!Array.isArray(body) || body.some(v => typeof v !== 'string')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const amenityIds: string[] = body

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Verify property belongs to user's organization
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, organization_id')
    .eq('id', id)
    .maybeSingle()

  if (propError) {
    return NextResponse.json({ error: propError.message }, { status: 500 })
  }

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  if (property.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get amenity names for the properties.amenities column (for backwards compatibility)
  let amenityNames: string[] = []
  if (amenityIds.length > 0) {
    const { data: amenityData, error: amenityError } = await adminClient
      .from('amenities')
      .select('name')
      .in('id', amenityIds)

    if (amenityError) return NextResponse.json({ error: amenityError.message }, { status: 500 })
    amenityNames = amenityData?.map(a => a.name) || []
  }

  // Replace all — delete existing then insert new (using admin client to bypass RLS)
  const { error: delError } = await adminClient
    .from('property_amenities')
    .delete()
    .eq('property_id', id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (amenityIds.length > 0) {
    const { error: insError } = await adminClient
      .from('property_amenities')
      .insert(amenityIds.map(amenity_id => ({ property_id: id, amenity_id })))

    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  // Sync with properties.amenities column (backwards compatibility)
  const { error: updateError } = await adminClient
    .from('properties')
    .update({ amenities: amenityNames, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
