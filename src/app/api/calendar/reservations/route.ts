import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { createClient } from '@/lib/supabase/server'

function propertyColor(propertyId: string): string {
  let hash = 0
  for (let index = 0; index < propertyId.length; index++) {
    hash = (hash * 31 + propertyId.charCodeAt(index)) >>> 0
  }
  return `hsl(${hash % 360}, 60%, 45%)`
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor', 'owner', 'viewer'])
    if (!auth.authorized) return auth.response
    if (!auth.organizationId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 })
    }

    const sessionClient = await createClient()
    const allowedPropertyIds = await getUserPropertyIds(sessionClient)
    if (allowedPropertyIds?.length === 0) return NextResponse.json([])

    const { searchParams } = request.nextUrl
    const propertyId = searchParams.get('property_id')
    if (propertyId && allowedPropertyIds !== null && !allowedPropertyIds.includes(propertyId)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const now = new Date()
    const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate())).toISOString().slice(0, 10)
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, now.getUTCDate())).toISOString().slice(0, 10)
    const rangeFrom = searchParams.get('from') ?? defaultFrom
    const rangeTo = searchParams.get('to') ?? defaultTo
    const adminClient = createAdminClient()

    let query = adminClient
      .from('reservations')
      .select('id, property_id, check_in, check_out, reservation_status, number_of_guests, guest_name, first_name, last_name, total_price, currency, notes')
      .eq('organization_id', auth.organizationId)
      .is('deleted_at', null)
      .in('reservation_status', ['confirmed', 'pending'])
      .lt('check_in', rangeTo)
      .gt('check_out', rangeFrom)

    if (propertyId) query = query.eq('property_id', propertyId)
    else if (allowedPropertyIds !== null) query = query.in('property_id', allowedPropertyIds)

    const { data: reservations, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const propertyIds = [...new Set((reservations ?? []).map((reservation) => reservation.property_id).filter(Boolean))]
    const { data: properties, error: propertiesError } = propertyIds.length > 0
      ? await adminClient.from('properties').select('id, name').in('id', propertyIds)
      : { data: [], error: null }
    if (propertiesError) return NextResponse.json({ error: propertiesError.message }, { status: 500 })

    const propertyNames = new Map((properties ?? []).map((property) => [property.id, property.name]))
    const events = (reservations ?? []).map((reservation) => {
      const guestName = reservation.guest_name || [reservation.first_name, reservation.last_name].filter(Boolean).join(' ') || 'Hóspede'
      const status = reservation.reservation_status || 'pending'
      const color = status === 'pending' ? '#d97706' : propertyColor(reservation.property_id)

      return {
        id: reservation.id,
        title: `${guestName} — ${propertyNames.get(reservation.property_id) || '—'}`,
        start: reservation.check_in,
        end: reservation.check_out,
        color,
        textColor: '#ffffff',
        borderColor: status === 'pending' ? '#92400e' : color,
        extendedProps: {
          type: 'reservation',
          guest_name: guestName,
          property_name: propertyNames.get(reservation.property_id) || '—',
          property_id: reservation.property_id,
          status,
          number_of_guests: reservation.number_of_guests,
          total_amount: reservation.total_price,
          currency: reservation.currency ?? null,
          notes: reservation.notes ?? null,
          opacity: status === 'pending' ? 0.65 : 1,
        },
      }
    })

    return NextResponse.json(events)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
