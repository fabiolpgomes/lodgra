import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { enqueueEmail } from '@/lib/email/queue'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const { reservationIds, reason = 'Canceladas em lote pelo proprietário' } = body

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      return NextResponse.json(
        { error: 'reservationIds deve ser um array não-vazio' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Fetch all reservations to be cancelled
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select(
        'id, check_in, check_out, property_listing_id, guests(first_name, last_name), property_listings(property_id)'
      )
      .in('id', reservationIds)

    if (fetchError || !reservations) {
      return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
    }

    if (reservations.length === 0) {
      return NextResponse.json({ error: 'Nenhuma reserva encontrada' }, { status: 404 })
    }

    // Cancel all reservations
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .in('id', reservationIds)

    if (updateError) {
      console.error('[Bulk Cancel API] UPDATE error:', updateError)
      return NextResponse.json(
        { error: 'Erro ao cancelar reservas' },
        { status: 500 }
      )
    }

    // Send email notifications for each cancelled reservation
    const emailPromises = reservations.map(async (reservation) => {
      try {
        const guest = reservation.guests as { first_name?: string; last_name?: string } | null
        const guestName = guest
          ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
          : 'Hóspede'

        const propertyId = (
          reservation.property_listings as { property_id?: string } | null
        )?.property_id

        if (!propertyId) return

        const { data: property } = await adminSupabase
          .from('properties')
          .select('id, name, owner_id')
          .eq('id', propertyId)
          .single()

        if (!property?.owner_id) return

        const { data: owner } = await adminSupabase
          .from('owners')
          .select('full_name, email')
          .eq('id', property.owner_id)
          .single()

        if (!owner?.email) return

        const nights = Math.ceil(
          (new Date(reservation.check_out).getTime() -
            new Date(reservation.check_in).getTime()) /
          (1000 * 60 * 60 * 24)
        )

        await enqueueEmail({
          type: 'owner_cancellation',
          ownerName: owner.full_name,
          ownerEmail: owner.email,
          guestName,
          propertyName: property.name || 'Propriedade',
          checkIn: reservation.check_in,
          checkOut: reservation.check_out,
          nights,
          cancellationReason: reason,
          source: 'calendar_bulk',
        })
      } catch (err) {
        console.error('[Bulk Cancel] Erro ao enviar email:', err)
      }
    })

    // Send emails in parallel (don't block response)
    Promise.all(emailPromises).catch((err) =>
      console.error('[Bulk Cancel] Erro ao enviar emails:', err)
    )

    console.log(
      `[Audit] ${reservationIds.length} reservas canceladas em lote. Razão: "${reason}"`
    )

    return NextResponse.json({
      success: true,
      cancelled: reservationIds.length,
    })
  } catch (error) {
    console.error('[Bulk Cancel API] Exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao cancelar reservas' },
      { status: 500 }
    )
  }
}
