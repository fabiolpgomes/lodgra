import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { validate, NotificationSchema } from '@/lib/schemas/api'
import { sendOwnerReservationNotification, sendOwnerCancellationNotification } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const validation = validate(NotificationSchema, body)
    if (!validation.ok) return validation.response

    const { reservation_id, type } = validation.data
    const supabase = await createClient()

    // Buscar reserva com guest e listing
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        total_amount,
        currency,
        source,
        booking_source,
        cancellation_reason,
        property_listing_id,
        guests:guest_id(first_name, last_name)
      `)
      .eq('id', reservation_id)
      .single()

    if (resError || !reservation) {
      console.error('Erro ao buscar reserva:', resError)
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    // Buscar property via listing
    const { data: listing } = await supabase
      .from('property_listings')
      .select('property_id, properties!inner(name, owner_id)')
      .eq('id', reservation.property_listing_id)
      .single()

    const property = listing?.properties as unknown as { name: string; owner_id: string } | null

    if (!property?.owner_id) {
      console.warn('Propriedade sem proprietário, pulando notificação')
      return NextResponse.json({ success: true, skipped: true })
    }

    // Buscar owner
    const { data: owner } = await supabase
      .from('owners')
      .select('full_name, email')
      .eq('id', property.owner_id)
      .single()

    if (!owner?.email) {
      console.warn('Proprietário sem email, pulando notificação')
      return NextResponse.json({ success: true, skipped: true })
    }

    const guest = reservation.guests as unknown as { first_name: string; last_name: string } | null
    const guestName = guest
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : 'Hóspede'

    const nights = Math.ceil(
      (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
    )

    if (type === 'cancellation') {
      await sendOwnerCancellationNotification({
        ownerName: owner.full_name,
        ownerEmail: owner.email,
        guestName,
        propertyName: property.name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        nights,
        cancellationReason: reservation.cancellation_reason || undefined,
        source: reservation.source || reservation.booking_source || 'manual',
      })
      console.log(`Notificação de cancelamento enviada ao proprietário ${owner.email} para reserva ${reservation_id}`)
    } else {
      await sendOwnerReservationNotification({
        ownerName: owner.full_name,
        ownerEmail: owner.email,
        guestName,
        propertyName: property.name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        nights,
        totalAmount: reservation.total_amount?.toString(),
        currency: reservation.currency || 'EUR',
        source: reservation.source || reservation.booking_source || 'manual',
      })
      console.log(`Notificação enviada ao proprietário ${owner.email} para reserva ${reservation_id}`)
    }
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao enviar notificação ao proprietário:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar notificação' },
      { status: 500 }
    )
  }
}
