import { createClient } from '@/lib/supabase/server'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const deleteReservationSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      guest_name,
      guest_email,
      guest_phone,
      status,
      total_price,
      notes,
    } = body

    // Validate required fields
    if (!guest_name) {
      return NextResponse.json(
        { error: 'Nome do hóspede é obrigatório' },
        { status: 400 }
      )
    }

    // Get original reservation (for audit comparison)
    const { data: originalReservation, error: fetchError } = await supabase
      .from('reservations')
      .select('guest_name, guest_email, guest_phone, reservation_status, total_price, notes')
      .eq('id', id)
      .single()

    if (fetchError || !originalReservation) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    // Update reservation
    const { data, error } = await supabase
      .from('reservations')
      .update({
        guest_name,
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        reservation_status: status || 'pending',
        total_price: total_price || 0,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: `Falha ao atualizar reserva: ${error.message}` },
        { status: 500 }
      )
    }

    // Log audit trail
    const changedFields: Record<string, any> = {}
    if (originalReservation?.guest_name !== guest_name) {
      changedFields.guest_name = {
        from: originalReservation?.guest_name,
        to: guest_name,
      }
    }
    if (originalReservation?.guest_email !== guest_email) {
      changedFields.guest_email = {
        from: originalReservation?.guest_email,
        to: guest_email,
      }
    }
    if (originalReservation?.guest_phone !== guest_phone) {
      changedFields.guest_phone = {
        from: originalReservation?.guest_phone,
        to: guest_phone,
      }
    }
    if (originalReservation?.reservation_status !== status) {
      changedFields.reservation_status = {
        from: originalReservation?.reservation_status,
        to: status,
      }
    }
    if (originalReservation?.total_price !== total_price) {
      changedFields.total_price = {
        from: originalReservation?.total_price,
        to: total_price,
      }
    }
    if (originalReservation?.notes !== notes) {
      changedFields.notes = {
        from: originalReservation?.notes,
        to: notes,
      }
    }

    // Audit failures are observable but do not roll back the successful edit.
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'reservation_updated',
        resource_type: 'reservation',
        resource_id: id,
        details: { changed_fields: changedFields },
      })
    if (auditError) {
      console.error('Reservation update audit failed:', auditError)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
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
    if (!access) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const parsedBody = deleteReservationSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Motivo do cancelamento inválido' }, { status: 400 })
    }

    const result = await cancelReservation(
      supabase,
      access,
      id,
      parsedBody.data.reason ?? null,
    )

    if (result.ok === false) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      reservation_id: result.reservationId,
      status: 'cancelled',
      already_cancelled: result.alreadyCancelled,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
