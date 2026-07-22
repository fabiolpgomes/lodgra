import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformUrl } from '@/lib/ical/bookingParser'

export const dynamic = 'force-dynamic'

/**
 * Endpoint para preencher dados históricos de platform metadata
 * Para cada reserva antiga com external_id, extrai booking_reference e cria platform_sync_url
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    console.log('[Backfill] Iniciando preenchimento de platform metadata...')

    // Buscar todas as reservas sem booking_reference mas com external_id
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('id, external_id, booking_source, created_at')
      .not('external_id', 'is', null)
      .or('booking_reference.is.null,platform_sync_url.is.null')
      .limit(1000)

    if (fetchError) {
      console.error('[Backfill] Erro ao buscar reservas:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let updated = 0
    let errors = 0
    const results = {
      booking: 0,
      airbnb: 0,
      vrbo: 0,
      flatio: 0,
      errors: 0,
    }

    // Atualizar cada reserva
    for (const res of reservations || []) {
      try {
        const externalId = res.external_id as string
        let platform = ''
        let bookingReference = ''
        let platformUrl = ''

        // Extrair platform e booking_reference do external_id
        if (externalId.startsWith('booking_')) {
          platform = 'booking'
          bookingReference = externalId.replace('booking_', '')
          platformUrl = getPlatformUrl('booking', bookingReference)
        } else if (externalId.startsWith('airbnb_')) {
          platform = 'airbnb'
          bookingReference = externalId.replace('airbnb_', '')
          platformUrl = getPlatformUrl('airbnb', bookingReference)
        } else if (externalId.startsWith('vrbo_')) {
          platform = 'vrbo'
          bookingReference = externalId.replace('vrbo_', '')
          platformUrl = getPlatformUrl('vrbo', bookingReference)
        } else if (externalId.startsWith('flatio_')) {
          platform = 'flatio'
          bookingReference = externalId.replace('flatio_', '')
          platformUrl = getPlatformUrl('flatio', bookingReference)
        }

        if (!platform) {
          console.warn(`[Backfill] Skipping reserva ${res.id}: external_id format unknown: ${externalId}`)
          continue
        }

        // Atualizar reserva
        const { error: updateError } = await supabase
          .from('reservations')
          .update({
            booking_reference: bookingReference,
            booking_source: platform,
            platform_sync_url: platformUrl,
            platform_synced_at: res.created_at, // Usar created_at como timestamp da sincronização original
          })
          .eq('id', res.id)

        if (updateError) {
          console.error(`[Backfill] Erro ao atualizar ${res.id}:`, updateError)
          errors++
          results.errors++
        } else {
          updated++
          results[platform as keyof typeof results]++
        }
      } catch (err) {
        console.error(`[Backfill] Exception ao processar ${res.id}:`, err)
        errors++
        results.errors++
      }
    }

    console.log(`[Backfill] ✅ Backfill concluído: ${updated} reservas atualizadas`, results)

    return NextResponse.json({
      success: true,
      message: 'Platform metadata preenchido com sucesso',
      stats: {
        total_processed: (reservations || []).length,
        total_updated: updated,
        total_errors: errors,
        by_platform: results,
      },
    })
  } catch (error: unknown) {
    console.error('[Backfill] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Backfill failed'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
