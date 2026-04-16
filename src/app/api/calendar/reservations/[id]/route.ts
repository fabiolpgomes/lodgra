import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

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
