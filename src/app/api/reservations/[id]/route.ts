import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    } = body

    // Validate required fields
    if (!guest_name) {
      return NextResponse.json(
        { error: 'Nome do hóspede é obrigatório' },
        { status: 400 }
      )
    }

    // Get original reservation (for audit comparison)
    const { data: originalReservation } = await supabase
      .from('reservations')
      .select('guest_name, guest_email, guest_phone, reservation_status, total_price')
      .eq('id', id)
      .single()

    // Update reservation
    const { data, error } = await supabase
      .from('reservations')
      .update({
        guest_name,
        guest_email: guest_email || null,
        guest_phone: guest_phone || null,
        reservation_status: status || 'pending',
        total_price: total_price || 0,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar reserva' },
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

    // Create audit log entry
    await supabase
      .from('reservation_audit_log')
      .insert({
        id: crypto.randomUUID(),
        reservation_id: id,
        action: 'updated',
        changed_fields: changedFields,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      })

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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body for soft delete reason
    const body = await request.json()
    const { reason } = body

    // Soft delete (set deleted_at)
    const { data, error } = await supabase
      .from('reservations')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Falha ao deletar reserva' },
        { status: 500 }
      )
    }

    // Create audit log entry
    await supabase
      .from('reservation_audit_log')
      .insert({
        id: crypto.randomUUID(),
        reservation_id: id,
        action: 'deleted',
        changed_fields: { reason },
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
