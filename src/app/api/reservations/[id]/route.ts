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

    // Update reservation (only update fields that are provided)
    const updateData: Record<string, any> = {
      guest_name,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      total_price: total_price ?? 0,
      notes: notes || null,
    }

    // Only update status if provided and valid
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed']
    if (status && validStatuses.includes(status.toLowerCase())) {
      updateData.reservation_status = status.toLowerCase()
    } else if (status) {
      return NextResponse.json(
        { error: `Status inválido. Valores permitidos: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
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
    if (status && originalReservation?.reservation_status !== status) {
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
        action: 'update',
        resource_type: 'reservation',
        resource_id: id,
        details: { event: 'reservation_updated', changed_fields: changedFields },
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  if (action === 'delete-permanent') {
    const { id } = await params
    const supabase = await createClient()

    try {
      const access = await getUserAccess(supabase)
      if (!access) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Verify reservation exists and is cancelled
      const { data: reservation, error: fetchError } = await supabase
        .from('reservations')
        .select('id, reservation_status')
        .eq('id', id)
        .single()

      if (fetchError || !reservation) {
        return NextResponse.json(
          { error: 'Reserva não encontrada' },
          { status: 404 }
        )
      }

      // Only allow deletion of cancelled reservations
      if (reservation.reservation_status !== 'cancelled') {
        return NextResponse.json(
          { error: 'Apenas reservas canceladas podem ser excluídas permanentemente' },
          { status: 400 }
        )
      }

      const { data: deleted, error: deleteError } = await supabase.rpc(
        'permanently_delete_cancelled_reservation',
        { p_reservation_id: id },
      )

      if (deleteError) {
        console.error('Delete error:', deleteError)
        return NextResponse.json(
          { error: `Falha ao excluir reserva: ${deleteError.message}` },
          { status: 500 }
        )
      }

      if (!deleted) {
        return NextResponse.json(
          { error: 'A reserva mudou de estado; atualize a página e tente novamente' },
          { status: 409 }
        )
      }

      return NextResponse.json({
        success: true,
        reservation_id: id,
        status: 'permanently_deleted',
      })
    } catch (error) {
      console.error('API error:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Ação não reconhecida' },
    { status: 400 }
  )
}
