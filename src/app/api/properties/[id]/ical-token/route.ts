import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId } = await params
    const supabase = createAdminClient()

    // Verify user has access to this property
    const { data: property, error } = await supabase
      .from('properties')
      .select('id, ical_export_token, organization_id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (error || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    return NextResponse.json({ ical_export_token: property.ical_export_token })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[ical-token] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: propertyId } = await params
    const supabase = createAdminClient()

    // Verify user has access to this property
    const { data: property } = await supabase
      .from('properties')
      .select('id, organization_id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Generate new token
    const { data, error } = await supabase
      .from('properties')
      .update({ ical_export_token: (await import('crypto')).randomUUID() })
      .eq('id', propertyId)
      .select('ical_export_token')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ical_export_token: data?.ical_export_token })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[ical-token] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
