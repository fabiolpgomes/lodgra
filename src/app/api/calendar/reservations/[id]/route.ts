import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { notifyPlatformSync } from '@/lib/ical/syncWebhook'
import { enqueueEmail } from '@/lib/email/queue'

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

    // Fetch reservation to get property_listing_id
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, property_listing_id')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }

    // Check for overlapping confirmed OR pending reservations on the same listing
    const { data: overlapping, error: overlapError } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('property_listing_id', reservation.property_listing_id)
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
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const supabase = await createClient()

    // Verify reservation exists and get required data
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('id, check_in, check_out, property_listing_id, guests(first_name, last_name), property_listings(property_id)')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }

    // Mark reservation as cancelled instead of deleting (preserves history)
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelada pelo proprietário no calendário',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[Reservations API] UPDATE error:', updateError)
      return NextResponse.json(
        { error: 'Erro ao cancelar reserva' },
        { status: 500 }
      )
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

    // Get property ID for webhook notification
    const propertyId = (reservation.property_listings as { property_id?: string } | null)?.property_id

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

    // Notify owner via email
    try {
      const adminSupabase = createAdminClient()
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Reservations API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao cancelar reserva' },
      { status: 500 }
    )
  }
}
