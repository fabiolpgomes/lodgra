import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Endpoint administrativo para atualizar external_ids existentes
 * para o novo formato estável: 'plataforma_numero'
 *
 * Conversões:
 * - '6816972454@booking.com' → 'booking_6816972454'
 * - '1234567890@airbnb.com' → 'airbnb_1234567890'
 * - 'vrbo_xxxxx' → já está no formato correto
 * - 'flatio_xxxxx' → já está no formato correto
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    console.log('[Migration] Iniciando atualização de external_ids...')

    // Buscar todas as reservas com external_id antigo
    const { data: allReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, external_id')
      .eq('booking_source', 'ical_auto_sync')
      .not('external_id', 'is', null)

    if (fetchError) {
      console.error('[Migration] Erro ao buscar reservas:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let bookingCount = 0
    let airbnbCount = 0
    let vrboCount = 0
    let flatioCount = 0
    const updated: string[] = []

    // Processar cada reserva e atualizar o external_id
    for (const res of allReservations || []) {
      let newExternalId: string | null = null

      if (res.external_id?.includes('@booking.com')) {
        newExternalId = 'booking_' + res.external_id.replace('@booking.com', '')
        bookingCount++
      } else if (res.external_id?.includes('@airbnb.com')) {
        newExternalId = 'airbnb_' + res.external_id.replace('@airbnb.com', '')
        airbnbCount++
      } else if (res.external_id?.includes('vrbo')) {
        newExternalId = 'vrbo_' + res.external_id.replace(/[@\.].*/, '')
        vrboCount++
      } else if (res.external_id?.includes('flatio')) {
        newExternalId = 'flatio_' + res.external_id.replace(/[@\.].*/, '')
        flatioCount++
      }

      if (newExternalId && newExternalId !== res.external_id) {
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ external_id: newExternalId })
          .eq('id', res.id)

        if (!updateError) {
          updated.push(res.id)
        } else {
          console.error(`[Migration] Erro ao atualizar ${res.id}:`, updateError)
        }
      }
    }

    console.log(
      `[Migration] ✅ Atualização concluída: ${updated.length} reservas migradas (Booking=${bookingCount}, Airbnb=${airbnbCount}, VRBO=${vrboCount}, Flatio=${flatioCount})`
    )

    return NextResponse.json({
      success: true,
      message: 'External IDs migrados com sucesso',
      stats: {
        total: updated.length,
        booking: bookingCount,
        airbnb: airbnbCount,
        vrbo: vrboCount,
        flatio: flatioCount,
      },
    })
  } catch (error: unknown) {
    console.error('[Migration] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Migration failed'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
