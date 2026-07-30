import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateICalWithBlocks } from '@/lib/ical/icalService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params
    const supabase = createAdminClient()

    // Verify token from query parameter
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Fetch property and verify token
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, ical_export_token')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Verify token matches
    if (!token || token !== property.ical_export_token) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 })
    }

    // Buscar listings da propriedade
    const { data: listings } = await supabase
      .from('property_listings')
      .select('id, ical_url, platform_id, sync_enabled, is_active, platforms(name, display_name)')
      .eq('property_id', propertyId)

    // Fetch calendar blocks for this property (always include, even if no listings)
    const { data: blocks } = await supabase
      .from('calendar_blocks')
      .select('id, start_date, end_date, notes')
      .eq('property_id', propertyId)
      .order('start_date', { ascending: true })

    if (!listings || listings.length === 0) {
      const icalData = generateICalWithBlocks([], (blocks || []) as unknown as Parameters<typeof generateICalWithBlocks>[1])
      const headers = new Headers({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="property-${propertyId}.ics"`,
      })
      return new NextResponse(icalData, { status: 200, headers })
    }

    const listingIds = listings.map(l => l.id)

    // Buscar reservas confirmadas/pendentes dos listings desta propriedade (exclui canceladas)
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        number_of_guests,
        property_listing_id,
        property_listings(
          property_id,
          properties(
            id,
            name
          )
        ),
        guests(
          first_name,
          last_name
        )
      `)
      .in('property_listing_id', listingIds)
      .in('status', ['confirmed', 'pending'])
      .neq('status', 'cancelled')
      .order('check_in', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Gerar arquivo iCal com reservas e bloqueios
    const icalData = generateICalWithBlocks(
      (reservations || []) as unknown as Parameters<typeof generateICalWithBlocks>[0],
      (blocks || []) as unknown as Parameters<typeof generateICalWithBlocks>[1]
    )

    // Retornar como arquivo .ics
    const headers = new Headers({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="property-${propertyId}.ics"`,
    })
    return new NextResponse(icalData, { status: 200, headers })
  } catch (error) {
    console.error('Erro ao gerar iCal:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar calendário' },
      { status: 500 }
    )
  }
}
