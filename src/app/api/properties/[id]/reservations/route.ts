import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const auth = await requireRole(['admin', 'manager', 'gestor', 'owner', 'viewer'])
    if (!auth.authorized) return auth.response
    if (!auth.organizationId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 })
    }

    const sessionClient = await createClient()
    const allowedPropertyIds = await getUserPropertyIds(sessionClient)
    if (allowedPropertyIds !== null && !allowedPropertyIds.includes(propertyId)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const { data: property, error: propertyError } = await adminClient
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle()

    if (propertyError) return NextResponse.json({ error: propertyError.message }, { status: 500 })
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const { data: reservations, error } = await adminClient
      .from('reservations')
      .select('id, check_in, check_out, reservation_status, number_of_guests, guest_name, first_name, last_name, total_price, currency')
      .eq('organization_id', auth.organizationId)
      .eq('property_id', propertyId)
      .is('deleted_at', null)
      .in('reservation_status', ['confirmed', 'pending'])
      .order('check_in', { ascending: true })

    if (error) return NextResponse.json({ success: false, data: [], error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      data: (reservations ?? []).map((reservation) => {
        const guestName = reservation.guest_name || [reservation.first_name, reservation.last_name].filter(Boolean).join(' ') || 'Hóspede'
        const nights = Math.max(1, Math.round((new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) / 86_400_000))
        return {
          id: reservation.id,
          guest_name: guestName,
          guest_count: reservation.number_of_guests,
          start_date: reservation.check_in,
          end_date: reservation.check_out,
          total_amount: reservation.total_price,
          price_per_night: Number(reservation.total_price || 0) / nights,
          currency: reservation.currency || 'EUR',
          status: reservation.reservation_status || 'pending',
        }
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
