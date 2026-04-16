import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReservationToOutboundPlatforms } from '@/lib/reservations/syncToOutboundPlatforms'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reservation_id } = body

    // Validação básica
    if (!reservation_id) {
      return NextResponse.json(
        { error: 'reservation_id é obrigatório' },
        { status: 400 }
      )
    }

    // Usar admin client para garantir acesso (fire-and-forget background task)
    const supabase = createAdminClient()

    // Buscar a reserva para obter property_id
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select(`
        id,
        property_listing_id,
        check_in,
        check_out,
        property_listings!inner(
          property_id
        )
      `)
      .eq('id', reservation_id)
      .single()

    if (reservationError || !reservation) {
      console.error(`[SyncToPlatforms API] Reserva não encontrada: ${reservationError?.message}`)
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    const propertyId = (reservation.property_listings as unknown as { property_id: string } | null)?.property_id

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Propriedade da reserva não encontrada' },
        { status: 404 }
      )
    }

    // Sincronizar com plataformas (fire-and-forget)
    const syncResult = await syncReservationToOutboundPlatforms(
      supabase,
      reservation_id,
      propertyId
    )

    return NextResponse.json({
      success: syncResult.success,
      synced_platforms: syncResult.synced_platforms,
      errors: syncResult.errors.length > 0 ? syncResult.errors : undefined,
      message: syncResult.message,
    })
  } catch (error: unknown) {
    console.error('[SyncToPlatforms API] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar com plataformas'
    return NextResponse.json(
      {
        error: message,
        success: false,
        synced_platforms: [],
      },
      { status: 500 }
    )
  }
}
