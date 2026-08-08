import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, isBlockedEvent } from '@/lib/ical/icalService'

export const dynamic = 'force-dynamic'

interface PropertySyncResult {
  propertyId: string
  propertyName: string
  platform: string
  icalUrl: string
  created: number
  updated: number
  cancelled: number
  blocked: number
  errors: number
  errorMessage?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const adminSupabase = await createAdminClient()
    const results: PropertySyncResult[] = []
    let totalCreated = 0, totalUpdated = 0, totalCancelled = 0, totalBlocked = 0, totalErrors = 0

    // Buscar todas as property_listings com iCal URL configurado
    const { data: listings, error: listingsError } = await adminSupabase
      .from('property_listings')
      .select(`
        id,
        name,
        ical_url,
        sync_enabled,
        platform,
        property_id,
        properties!inner(id, name, organization_id)
      `)
      .eq('sync_enabled', true)
      .not('ical_url', 'is', null)

    if (listingsError || !listings?.length) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma propriedade com iCal configurado',
        properties: [],
        summary: { created: 0, updated: 0, cancelled: 0, blocked: 0, errors: 0 }
      })
    }

    console.log(`[trigger-ical-sync] Sincronizando ${listings.length} propriedade(s)...`)

    // Sincronizar cada propriedade
    for (const listing of listings) {
      try {
        const propertyName = (listing.properties as any)?.name || listing.name || 'Desconhecida'
        const platform = listing.platform || 'Desconhecida'

        console.log(`[trigger-ical-sync] Iniciando sync: ${propertyName} (${platform})`)

        let created = 0, updated = 0, cancelled = 0, blocked = 0

        // Buscar eventos do iCal
        const events = await importICalFromUrl(listing.ical_url)
        console.log(`[trigger-ical-sync] ${listing.id}: ${events.length} evento(s) importado(s)`)

        const now = new Date()
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        const twoYearsFromNow = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()))

        for (const event of events) {
          const checkIn = event.start.toISOString().split('T')[0]
          const checkOut = event.end.toISOString().split('T')[0]
          const isBlocked = isBlockedEvent(event)
          const durationDays = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24))

          // Filtrar eventos fora do intervalo ou muito longos
          if (event.end < today || event.start > twoYearsFromNow || durationDays > 180) {
            continue
          }

          if (isBlocked) {
            blocked++
          } else {
            // Verificar se reserva já existe
            const { data: existing } = await adminSupabase
              .from('reservations')
              .select('id')
              .eq('external_id', event.uid)
              .eq('property_listing_id', listing.id)
              .limit(1)
              .single()

            if (existing) {
              updated++
            } else {
              created++
            }
          }
        }

        const result: PropertySyncResult = {
          propertyId: listing.property_id,
          propertyName,
          platform,
          icalUrl: listing.ical_url,
          created,
          updated,
          cancelled,
          blocked,
          errors: 0
        }

        // Clear error tracking on successful sync
        await adminSupabase.from('property_listings').update({
          last_sync_error: null,
          sync_error_count: 0
        }).eq('id', listing.id)

        results.push(result)
        totalCreated += created
        totalUpdated += updated
        totalCancelled += cancelled
        totalBlocked += blocked

        console.log(`[trigger-ical-sync] Resultado: ${propertyName} - Criadas: ${created}, Atualizadas: ${updated}, Bloqueios: ${blocked}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`[trigger-ical-sync] Erro ao sincronizar ${listing.id}:`, err)

        // Update listing with error tracking
        const { data: currentListing } = await adminSupabase
          .from('property_listings')
          .select('sync_error_count')
          .eq('id', listing.id)
          .single()

        const newErrorCount = (currentListing?.sync_error_count || 0) + 1

        await adminSupabase.from('property_listings').update({
          last_sync_error: errorMessage,
          sync_error_count: newErrorCount
        }).eq('id', listing.id)

        const propertyName = (listing.properties as any)?.name || listing.name || 'Desconhecida'
        const platform = listing.platform || 'Desconhecida'

        results.push({
          propertyId: listing.property_id,
          propertyName,
          platform,
          icalUrl: listing.ical_url,
          created: 0,
          updated: 0,
          cancelled: 0,
          blocked: 0,
          errors: 1,
          errorMessage
        })

        totalErrors++
      }
    }

    return NextResponse.json({
      success: true,
      properties: results,
      summary: {
        totalProperties: listings.length,
        created: totalCreated,
        updated: totalUpdated,
        cancelled: totalCancelled,
        blocked: totalBlocked,
        errors: totalErrors
      }
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[trigger-ical-sync] Erro geral:', err)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
