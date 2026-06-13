import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/calendar/blocks/debug/property-check?property_id={propertyId}
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('property_id')

    if (!propertyId) {
      return NextResponse.json({ error: 'property_id parameter required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check property
    const { data: property, error: propError } = await adminSupabase
      .from('properties')
      .select('id, name, organization_id')
      .eq('id', propertyId)
      .single()

    // Check calendar_blocks for this property
    const { data: blocks, error: blocksError } = await adminSupabase
      .from('calendar_blocks')
      .select('id, organization_id, start_date, end_date')
      .eq('property_id', propertyId)
      .limit(3)

    return NextResponse.json({
      searching_property_id: propertyId,
      property: property ? {
        id: property.id,
        name: property.name,
        organization_id: property.organization_id,
      } : null,
      propertyError: propError ? { message: propError.message, code: propError.code } : null,
      blocksForProperty: blocks?.length || 0,
      blockSample: blocks?.map(b => ({
        id: b.id,
        org_id: b.organization_id,
        dates: `${b.start_date} to ${b.end_date}`,
      })) || [],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
