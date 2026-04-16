import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { validate, UpdateReservationSchema, PatchReservationSchema } from '@/lib/schemas/api'
import { writeAuditLog } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const body = await request.json()

    const validation = validate(UpdateReservationSchema, body)
    if (!validation.ok) return validation.response

    const {
      property_listing_id,
      check_in,
      check_out,
      status,
      number_of_guests,
      total_amount,
      guest_first_name,
      guest_last_name,
      guest_email,
      guest_phone,
    } = validation.data

    const supabase = await createClient()

    // Buscar reserva atual com property_id para controlo de acesso
    const { data: currentReservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*, guests(*), property_listings!inner(property_id)')
      .eq('id', id)
      .single()

    if (fetchError || !currentReservation) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso à propriedade (managers com escopo restrito)
    const propertyId = (currentReservation.property_listings as unknown as { property_id: string } | null)?.property_id
    const allowedPropertyIds = await getUserPropertyIds(supabase)
    if (allowedPropertyIds !== null && propertyId && !allowedPropertyIds.includes(propertyId)) {
      return NextResponse.json(
        { error: 'Acesso negado a esta propriedade' },
        { status: 403 }
      )
    }

    // Atualizar dados do hóspede
    const { error: guestError } = await supabase
      .from('guests')
      .update({
        first_name: guest_first_name,
        last_name: guest_last_name,
        email: guest_email,
        phone: guest_phone || null,
      })
      .eq('id', currentReservation.guest_id)

    if (guestError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar hóspede: ' + guestError.message },
        { status: 500 }
      )
    }

    // Atualizar reserva
    const { data: updatedReservation, error: updateError } = await supabase
      .from('reservations')
      .update({
        property_listing_id,
        check_in,
        check_out,
        status,
        number_of_guests,
        total_amount: total_amount || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar reserva: ' + updateError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'update',
      resourceType: 'reservation',
      resourceId: id,
      details: { status, check_in, check_out, property_listing_id },
    })

    return NextResponse.json({
      success: true,
      reservation: updatedReservation
    })

  } catch (error: unknown) {
    console.error('Erro na API de atualização:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar reserva' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const body = await request.json()

    const validation = validate(PatchReservationSchema, body)
    if (!validation.ok) return validation.response

    const { internal_notes } = validation.data
    const supabase = await createClient()

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        internal_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar nota: ' + updateError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'update',
      resourceType: 'reservation',
      resourceId: id,
      details: { field: 'internal_notes' },
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Erro na API PATCH:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar nota' },
      { status: 500 }
    )
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

    // Buscar reserva com property_id para controlo de acesso
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*, guests(id, email), property_listings!inner(property_id)')
      .eq('id', id)
      .single()

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    // Verificar acesso à propriedade (managers com escopo restrito)
    const propertyId = (reservation.property_listings as unknown as { property_id: string } | null)?.property_id
    const allowedPropertyIds = await getUserPropertyIds(supabase)
    if (allowedPropertyIds !== null && propertyId && !allowedPropertyIds.includes(propertyId)) {
      return NextResponse.json(
        { error: 'Acesso negado a esta propriedade' },
        { status: 403 }
      )
    }

    // Eliminar a reserva
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao eliminar reserva: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Se o hóspede é "importado" (email @homestay.local), eliminar também
    const guestEmail = (reservation.guests as { id: string; email: string } | null)?.email || ''
    if (guestEmail.endsWith('@homestay.local')) {
      await supabase
        .from('guests')
        .delete()
        .eq('id', reservation.guest_id)
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'delete',
      resourceType: 'reservation',
      resourceId: id,
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Erro ao eliminar reserva:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao eliminar reserva' },
      { status: 500 }
    )
  }
}
