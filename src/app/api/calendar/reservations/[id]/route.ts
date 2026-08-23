import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { requireRole } from '@/lib/auth/requireRole'
import { notifyPlatformSync } from '@/lib/ical/syncWebhook'
import { enqueueEmail } from '@/lib/email/queue'
import { cancelReservationInBeds24 } from '@/lib/reservations/syncToBeds24'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { notifyAllPlatforms } from '@/lib/integrations/platform-notifier'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const body = await request.json()
    const { check_in, check_out } = body

    if (!check_in || !check_out) {
      return NextResponse.json({ error: 'check_in e check_out são obrigatórios' }, { status: 400 })
    }
    if (check_in >= check_out) {
      return NextResponse.json({ error: 'check_in deve ser anterior a check_out' }, { status: 400 })
    }

    const supabase = await createClient()

    // The property is the canonical reservation scope; a channel listing is optional.
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, property_id')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }

    // Check for overlapping confirmed OR pending reservations on the same property.
    const { data: overlapping, error: overlapError } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('property_id', reservation.property_id)
      .in('status', ['confirmed', 'pending'])
      .neq('id', id)
      .lt('check_in', check_out)
      .gt('check_out', check_in)
      .limit(1)

    if (overlapError) {
      return NextResponse.json({ error: overlapError.message }, { status: 500 })
    }

    if (overlapping && overlapping.length > 0) {
      const conflictStatus = overlapping[0].status === 'pending' ? 'pendente' : 'confirmada'
      return NextResponse.json(
        { error: `As datas seleccionadas estão em conflito com outra reserva ${conflictStatus}` },
        { status: 409 }
      )
    }

    // Update dates
    const { error: updateError } = await supabase
      .from('reservations')
      .update({ check_in, check_out, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, check_in, check_out })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const access = await getUserAccess(supabase)

    if (!access || !['admin', 'gestor'].includes(access.profile.role)) {
      return NextResponse.json(
        { error: access ? 'Permissão insuficiente' : 'Não autenticado' },
        { status: access ? 403 : 401 }
      )
    }

    // Verify reservation exists and get required data
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, property_id, check_in, check_out, property_listing_id, guests(first_name, last_name)')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }

    const cancellationResult = await cancelReservation(
      supabase,
      access,
      id,
      'Cancelada pelo proprietário no calendário'
    )

    if (cancellationResult.ok === false) {
      return NextResponse.json(
        { error: cancellationResult.error },
        { status: cancellationResult.status }
      )
    }

    if (cancellationResult.alreadyCancelled) {
      return NextResponse.json({
        success: true,
        reservation_id: id,
        already_cancelled: true,
      })
    }

    // Fetch beds24_booking_id if it exists (for sync on cancel)
    const { data: existingRes } = await supabase
      .from('reservations')
      .select('beds24_booking_id, source')
      .eq('id', id)
      .single()

    // Sync cancellation to Beds24 if this reservation has a beds24_booking_id
    if (existingRes?.beds24_booking_id) {
      try {
        const beds24Result = await cancelReservationInBeds24(existingRes.beds24_booking_id)
        if (beds24Result.success) {
          console.log(`[Reservations API] Beds24 cancellation synced: ${existingRes.beds24_booking_id}`)
        } else {
          console.warn(`[Reservations API] Beds24 cancellation failed: ${beds24Result.error}`)
          // Don't fail the main cancellation, just log it
        }
      } catch (beds24Error) {
        console.error('[Reservations API] Error syncing Beds24 cancellation:', beds24Error)
        // Don't block the cancellation if Beds24 sync fails
      }
    }

    // Log cancellation for audit trail
    const guest = (reservation.guests as { first_name?: string; last_name?: string } | null)
    const guestName = guest
      ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
      : 'Desconhecido'

    console.log(
      `[Audit] Reserva cancelada: ID=${id}, Hóspede="${guestName}", ` +
      `Período=${reservation.check_in} até ${reservation.check_out}`
    )

    const propertyId = reservation.property_id

    // Notify platforms about the cancellation for faster sync
    if (propertyId) {
      await notifyPlatformSync({
        event: 'reservation_cancelled',
        timestamp: new Date().toISOString(),
        propertyId,
        eventId: id,
        eventData: {
          type: 'reservation',
          checkIn: reservation.check_in,
          checkOut: reservation.check_out,
          title: guestName,
          reason: 'Cancelada pelo proprietário',
        },
      })
    }

    // Send real-time push notifications to platforms (reduces sync delay from ~24h to seconds)
    try {
      await notifyAllPlatforms(id, 'cancelled')
    } catch (notifyError) {
      console.warn('[Reservations API] Platform notification failed:', notifyError)
      // Don't block cancellation if platform notification fails
    }

    // Notify owner via email
    try {
      const adminSupabase = await createAdminClient()
      const nights = Math.ceil(
        (new Date(reservation.check_out).getTime() - new Date(reservation.check_in).getTime()) /
        (1000 * 60 * 60 * 24)
      )

      // Get property and owner info
      const { data: property } = await adminSupabase
        .from('properties')
        .select('id, name, owner_id')
        .eq('id', propertyId)
        .single()

      if (property?.owner_id) {
        const { data: owner } = await adminSupabase
          .from('owners')
          .select('full_name, email')
          .eq('id', property.owner_id)
          .single()

        if (owner?.email) {
          await enqueueEmail({
            type: 'owner_cancellation',
            ownerName: owner.full_name,
            ownerEmail: owner.email,
            guestName,
            propertyName: property.name || 'Propriedade',
            checkIn: reservation.check_in,
            checkOut: reservation.check_out,
            nights,
            cancellationReason: 'Cancelada pelo proprietário no calendário',
            source: 'calendar_manual',
          })
        }
      }
    } catch (emailError) {
      console.error('[Reservations API] Erro ao enviar email de cancelamento:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      reservation_id: id,
      already_cancelled: false,
      refund_info: cancellationResult.refundInfo,
    })
  } catch (error) {
    console.error('[Reservations API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao cancelar reserva' },
      { status: 500 }
    )
  }
}
