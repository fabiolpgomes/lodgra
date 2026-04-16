import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateICalFromReservations } from '@/lib/ical/icalService'

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

    if (!listings || listings.length === 0) {
      const icalData = generateICalFromReservations([])
      const headers = new Headers({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="property-${propertyId}.ics"`,
      })
      return new NextResponse(icalData, { status: 200, headers })
    }

    const listingIds = listings.map(l => l.id)

    // Buscar reservas confirmadas/pendentes dos listings desta propriedade
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
      .order('check_in', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Gerar arquivo iCal
    const icalData = generateICalFromReservations((reservations || []) as unknown as Parameters<typeof generateICalFromReservations>[0])

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
