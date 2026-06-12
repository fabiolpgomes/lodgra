import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const { reservationIds } = body

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      return NextResponse.json(
        { error: 'reservationIds deve ser um array não-vazio' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify all reservations are cancelled
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, status, cancelled_at, check_in, check_out, guests(first_name, last_name)')
      .in('id', reservationIds)

    if (fetchError || !reservations) {
      return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
    }

    const cancelledReservations = reservations.filter((r) => r.status === 'cancelled')
    if (cancelledReservations.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma reserva cancelada para recuperar' },
        { status: 400 }
      )
    }

    // Recover reservations (mark as confirmed)
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'confirmed',
        cancelled_at: null,
        cancellation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', reservationIds)
      .eq('status', 'cancelled')

    if (updateError) {
      console.error('[Recover API] UPDATE error:', updateError)
      return NextResponse.json(
        { error: 'Erro ao recuperar reservas' },
        { status: 500 }
      )
    }

    // Log recovery for audit trail
    const recoveredNames = cancelledReservations
      .map((r) => {
        const guest = r.guests as { first_name?: string; last_name?: string } | null
        return guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Desconhecido'
      })
      .join(', ')

    console.log(
      `[Audit] ${cancelledReservations.length} reservas recuperadas. ` +
      `Hóspedes: "${recoveredNames}"`
    )

    return NextResponse.json({
      success: true,
      recovered: cancelledReservations.length,
    })
  } catch (error) {
    console.error('[Recover API] Exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao recuperar reservas' },
      { status: 500 }
    )
  }
}
