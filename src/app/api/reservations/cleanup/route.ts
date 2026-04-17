import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

interface CancelledReservationRow {
  id: string
  guest_id: string
  guests: { email: string } | null
}

interface PhantomReservationRow {
  id: string
  guest_id: string
  guests: { id: string; email: string }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const { type } = body // 'cancelled' | 'phantom' | 'all'

    if (!type || !['cancelled', 'phantom', 'all'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use: cancelled, phantom ou all' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    let totalDeleted = 0

    // Eliminar reservas canceladas
    if (type === 'cancelled' || type === 'all') {
      // Buscar reservas canceladas com dados do hóspede
      const { data: cancelledReservations } = await supabase
        .from('reservations')
        .select('id, guest_id, guests(email)')
        .eq('status', 'cancelled')

      if (cancelledReservations && cancelledReservations.length > 0) {
        // Eliminar reservas
        const { error } = await supabase
          .from('reservations')
          .delete()
          .eq('status', 'cancelled')

        if (!error) {
          totalDeleted += cancelledReservations.length

          // Eliminar hóspedes importados associados
          const importedGuestIds = (cancelledReservations as unknown as CancelledReservationRow[])
            .filter((r) => r.guests?.email?.endsWith('@lodgra.local'))
            .map((r) => r.guest_id)

          if (importedGuestIds.length > 0) {
            await supabase
              .from('guests')
              .delete()
              .in('id', importedGuestIds)
          }
        }
      }
    }

    // Eliminar reservas fantasma (importadas com hóspede temporário)
    if (type === 'phantom' || type === 'all') {
      // Buscar reservas importadas com hóspede @lodgra.local
      const { data: phantomReservations } = await supabase
        .from('reservations')
        .select('id, guest_id, guests!inner(id, email)')
        .in('booking_source', ['ical_import', 'ical_auto_sync'])
        .like('guests.email', '%@lodgra.local')

      if (phantomReservations && phantomReservations.length > 0) {
        const ids = (phantomReservations as unknown as PhantomReservationRow[]).map((r) => r.id)
        const guestIds = (phantomReservations as unknown as PhantomReservationRow[]).map((r) => r.guest_id)

        const { error } = await supabase
          .from('reservations')
          .delete()
          .in('id', ids)

        if (!error) {
          totalDeleted += phantomReservations.length

          // Eliminar hóspedes temporários
          if (guestIds.length > 0) {
            await supabase
              .from('guests')
              .delete()
              .in('id', guestIds)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
    })

  } catch (error: unknown) {
    console.error('Erro na limpeza:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao limpar reservas' },
      { status: 500 }
    )
  }
}

// GET para obter contagens antes de confirmar
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const supabase = await createClient()

    // Contar canceladas
    const { count: cancelledCount } = await supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    // Contar fantasmas
    const { data: phantomReservations } = await supabase
      .from('reservations')
      .select('id, guests!inner(email)')
      .in('booking_source', ['ical_import', 'ical_auto_sync'])
      .like('guests.email', '%@lodgra.local')

    return NextResponse.json({
      cancelled: cancelledCount || 0,
      phantom: phantomReservations?.length || 0,
    })

  } catch (error: unknown) {
    console.error('Erro ao contar reservas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao contar reservas' },
      { status: 500 }
    )
  }
}
