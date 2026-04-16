import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

/** Deterministic colour from property ID (HSL) */
function propertyColor(propertyId: string): string {
  let hash = 0
  for (let i = 0; i < propertyId.length; i++) {
    hash = (hash * 31 + propertyId.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `hsl(${hue}, 60%, 45%)`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const propertyId = searchParams.get('property_id')

    // Default: current month
    const now = new Date()
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

    const supabase = await createClient()

    // Resolve which property listings the user can see
    const allowedPropertyIds = await getUserPropertyIds(supabase)

    let query = supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        number_of_guests,
        property_listing_id,
        guests ( first_name, last_name ),
        property_listings!inner (
          property_id,
          properties ( id, name )
        )
      `)
      .in('status', ['confirmed', 'pending'])
      .gte('check_out', from ?? defaultFrom)
      .lte('check_in', to ?? defaultTo)

    if (propertyId) {
      query = query.eq('property_listings.property_id', propertyId)
    }

    const { data: reservations, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    type Guest = { first_name: string | null; last_name: string | null } | null
    type PropertyListing = {
      property_id: string
      properties: { id: string; name: string } | null
    } | null

    const events = (reservations ?? [])
      .filter(r => {
        const pl = r.property_listings as unknown as PropertyListing
        if (!pl) return false
        if (allowedPropertyIds !== null && !allowedPropertyIds.includes(pl.property_id)) return false
        return true
      })
      .map(r => {
        const pl = r.property_listings as unknown as PropertyListing
        const guest = r.guests as unknown as Guest
        const property = pl?.properties
        const guestName = [guest?.first_name, guest?.last_name].filter(Boolean).join(' ') || 'Hóspede'
        const propName = property?.name || '—'
        const propId = pl?.property_id ?? ''

        // Pending reservations use a muted amber — confirmed use property colour
        const color = r.status === 'pending' ? '#d97706' : propertyColor(propId)
        const opacity = r.status === 'pending' ? 0.65 : 1

        // FullCalendar: end date is exclusive, so add 1 day to make the checkout date visible in calendar
        const endDate = new Date(r.check_out)
        endDate.setDate(endDate.getDate() + 1)
        const end = endDate.toISOString().slice(0, 10)

        return {
          id: r.id,
          title: `${guestName} — ${propName}`,
          start: r.check_in,
          end,
          color,
          textColor: '#ffffff',
          borderColor: r.status === 'pending' ? '#92400e' : color,
          extendedProps: {
            guest_name: guestName,
            property_name: propName,
            property_id: propId,
            status: r.status,
            number_of_guests: r.number_of_guests,
            opacity,
          },
        }
      })

    return NextResponse.json(events)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
