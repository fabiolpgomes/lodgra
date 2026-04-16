import { SupabaseClient } from '@supabase/supabase-js'

export interface SyncToPlatformsResult {
  success: boolean
  synced_platforms: string[]
  errors: string[]
  message?: string
}

/**
 * Sincroniza uma reserva criada na app para as plataformas (Booking, Airbnb, Flatio).
 * Usa o iCal export existente que já está cadastrado nas plataformas.
 * Esta é uma operação "fire-and-forget" que registra logs mas não bloqueia a criação.
 *
 * Fluxo:
 * 1. Buscar o iCal export token da propriedade
 * 2. Registrar o sincronismo nos logs
 * 3. Plataformas farão polling diário do iCal e verão a reserva
 *
 * @param supabase - Cliente Supabase (admin ou autenticado)
 * @param reservationId - ID da reserva criada
 * @param propertyId - ID da propriedade
 * @returns Resultado da sincronização
 */
export async function syncReservationToOutboundPlatforms(
  supabase: SupabaseClient,
  reservationId: string,
  propertyId: string
): Promise<SyncToPlatformsResult> {
  const result: SyncToPlatformsResult = {
    success: true,
    synced_platforms: [],
    errors: [],
  }

  try {
    // Buscar propriedade e seu iCal export token
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, ical_export_token, name')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      const msg = `Propriedade não encontrada (${propError?.message || 'unknown'})`
      console.error(`[SyncToOutbound] ${msg}`)
      result.errors.push(msg)
      return result
    }

    if (!property.ical_export_token) {
      const msg = 'Propriedade sem token de exportação iCal'
      console.warn(`[SyncToOutbound] ${msg}`)
      result.errors.push(msg)
      return result
    }

    // Buscar listings ativos da propriedade (plataformas onde sincronizar)
    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select(`
        id,
        property_id,
        platform_id,
        platforms(
          id,
          name,
          display_name
        ),
        sync_enabled,
        is_active
      `)
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (listingsError) {
      const msg = `Erro ao buscar anúncios: ${listingsError.message}`
      console.error(`[SyncToOutbound] ${msg}`)
      result.errors.push(msg)
      return result
    }

    if (!listings || listings.length === 0) {
      result.message = 'Propriedade sem anúncios cadastrados em plataformas'
      return result
    }

    // Para cada listing/plataforma, registrar que a sincronização foi enviada
    for (const listing of listings) {
      try {
        const platformName = (listing.platforms as { name?: string; display_name?: string } | null)?.display_name ||
          (listing.platforms as { name?: string; display_name?: string } | null)?.name ||
          'unknown'

        // Registrar log de sincronização
        // A plataforma fará polling do iCal em seu cronograma (diário ou menos frequente)
        const { error: logError } = await supabase
          .from('sync_logs')
          .insert({
            property_listing_id: listing.id,
            reservation_id: reservationId,
            sync_type: 'outbound',
            direction: 'app_to_platform',
            status: 'pending',
            message: `Reserva ${reservationId} aguardando polling da plataforma`,
            synced_at: new Date().toISOString(),
          })

        if (logError) {
          console.warn(`[SyncToOutbound] Erro ao registrar log para ${platformName}: ${logError.message}`)
          result.errors.push(`Erro ao registrar sync para ${platformName}`)
        } else {
          console.log(`[SyncToOutbound] Log registrado para ${platformName} (${listing.id})`)
          result.synced_platforms.push(platformName)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`[SyncToOutbound] Erro ao sincronizar listing ${listing.id}: ${msg}`)
        result.errors.push(`Erro ao sincronizar com plataforma: ${msg}`)
      }
    }

    // Marcar a reserva como "synced_to_platforms = true" se houver sucesso
    if (result.synced_platforms.length > 0 && result.errors.length === 0) {
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          synced_to_platforms: true,
          synced_platforms_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      if (updateError) {
        console.warn(`[SyncToOutbound] Erro ao marcar reserva como sincronizada: ${updateError.message}`)
      }
    }

    result.success = result.errors.length === 0
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[SyncToOutbound] Erro crítico: ${msg}`)
    result.success = false
    result.errors.push(`Erro crítico na sincronização: ${msg}`)
    return result
  }
}
