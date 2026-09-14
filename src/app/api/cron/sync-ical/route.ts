import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, classifyICalEvent } from '@/lib/ical/icalService'
import {
  buildReservationExternalIdContext,
  cancelMissingReservations,
  removeMissingCalendarBlocks,
} from '@/lib/ical/reservationSync'
import { upsertCalendarEventAudit } from '@/lib/ical/calendarEventAudit'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { importPendingICalReservation } from '@/lib/ical/pendingReservation'

export const dynamic = 'force-dynamic'

// ─── Per-listing sync logic ───────────────────────────────────────────────────

type SyncResult = { created: number; updated: number; blocked: number; unknown: number; skipped: number; cancelled: number; processed: number }

async function syncOneListing(
  supabase: ReturnType<typeof createAdminClient>,
  listing: {
    id: string
    ical_url: string
    property_id: string
    sync_enabled: boolean
    properties: unknown
    platforms?: unknown
  },
  progress: SyncResult
): Promise<SyncResult> {
  let created = 0, updated = 0, blocked = 0, unknown = 0, skipped = 0, processed = 0
  let cancelled = 0

  // Extract organization_id from listing (needed for both reservations and blocks)
  const cronOrgId = (listing.properties as unknown as { organization_id?: string })?.organization_id as string | undefined
  if (!cronOrgId) {
    throw new Error(`Listing ${listing.id} has no organization_id`)
  }

  console.log(`[Cron] Sincronizando anúncio ${listing.id}...`)
  const syncStartedAt = new Date().toISOString()
  const events = await importICalFromUrl(listing.ical_url)
  console.log(`[Cron] Listing ${listing.id}: ${events.length} evento(s)`)
  const receivedUids = new Set(events.map(e => e.uid))
  const receivedExternalIds = new Set<string>()
  const receivedCalendarEventIds = new Set<string>()

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const twoYearsFromNow = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()))

  for (const event of events) {
    const externalIdContext = buildReservationExternalIdContext(event)
    const source = externalIdContext.source

    const checkIn = event.start.toISOString().split('T')[0]
    const checkOut = event.end.toISOString().split('T')[0]

    const classification = classifyICalEvent(event)
    const audit = await upsertCalendarEventAudit({
      supabase,
      organizationId: cronOrgId,
      propertyId: listing.property_id,
      propertyListingId: listing.id,
      sourcePlatform: source,
      event,
      classification,
    })

    receivedCalendarEventIds.add(audit.id)
    for (const candidate of externalIdContext.externalIdCandidates) receivedExternalIds.add(candidate)

    // Standard logging
    console.log(`[Cron] Event classification:`, {
      summary: event.summary?.substring(0, 50),
      uid: event.uid?.substring(0, 50),
      checkIn,
      checkOut,
      classification,
      durationDays: Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)),
    })

    if (event.end < today || event.start > twoYearsFromNow) {
      console.log(`[Cron] Evento fora do intervalo (antes ${today} ou depois ${twoYearsFromNow}): "${event.summary}"`)
      skipped++; processed++; progress.skipped++; progress.processed++
      continue
    }

    const requiresHostReview =
      (source === 'booking' || classification === 'reservation' ||
        audit.status === 'matched' || audit.status === 'ignored') &&
      classification !== 'unknown'

    if (requiresHostReview) {
      const pending = await importPendingICalReservation(supabase, cronOrgId, audit.id, externalIdContext.externalIdCandidates)
      receivedExternalIds.add(`ical_${audit.id}`)
      if (pending.action === 'created') { created++; progress.created++ }
      else if (pending.action === 'updated') { updated++; progress.updated++ }
      else if (pending.action === 'blocked') { blocked++; progress.blocked++ }
      else { skipped++; progress.skipped++ }
      processed++; progress.processed++
      continue
    }

    if (classification === 'unknown') {
      console.log(`[Cron] Evento sem evidência suficiente para classificar: "${event.summary}" (${event.uid})`)
      unknown++; processed++; progress.unknown++; progress.processed++
      continue
    }

    // Check if this event is a blocked/unavailable date (not a guest reservation)
    if (classification === 'block') {
      console.log(`[Cron] Bloqueio detectado para listing ${listing.id}:`, {
        summary: event.summary,
        uid: event.uid,
        checkIn,
        checkOut,
        propertyId: listing.property_id,
        cronOrgId,
      })

      // Create or update a tenant-scoped block instead of a reservation.
      const blockOrgId = cronOrgId

      if (!event.uid) {
        throw new Error(`Bloqueio sem UID para listing ${listing.id}`)
      }

      // Verificar se bloqueio já existe (pelo external_uid)
      let blockError = null
      if (event.uid) {
        let { data: existing, error: existingError } = await supabase
          .from('calendar_blocks')
          .select('id, property_listing_id')
          .eq('external_uid', event.uid)
          .eq('property_id', listing.property_id)
          .eq('organization_id', blockOrgId)
          .eq('property_listing_id', listing.id)
          .maybeSingle()

        if (existingError) {
          throw new Error(`Falha ao localizar bloqueio ${event.uid}: ${existingError.message}`)
        }

        // Adopt a pre-provenance block instead of creating a duplicate. New
        // writes always carry property_listing_id, so this path self-heals
        // brownfield rows as their feed events are observed.
        if (!existing) {
          const legacyLookup = await supabase
            .from('calendar_blocks')
            .select('id, property_listing_id')
            .eq('external_uid', event.uid)
            .eq('property_id', listing.property_id)
            .eq('organization_id', blockOrgId)
            .is('property_listing_id', null)
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle()
          existing = legacyLookup.data
          existingError = legacyLookup.error
          if (existingError) {
            throw new Error(`Falha ao localizar bloqueio legado ${event.uid}: ${existingError.message}`)
          }
        }

        if (existing) {
          console.log(`[Cron] Bloqueio ${event.uid} já existe, atualizando...`)
          // Atualizar bloqueio existente
          const { error: updateError } = await supabase
            .from('calendar_blocks')
            .update({
              start_date: checkIn,
              end_date: checkOut,
              notes: event.summary || 'Bloqueado pela plataforma',
              block_type: 'platform_sync',
              property_listing_id: listing.id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          blockError = updateError
          if (blockError) {
            console.error(`[Cron] Erro ao atualizar bloqueio ${event.uid}:`, blockError)
          }
        } else {
          console.log(`[Cron] Criando novo bloqueio com dados:`, {
            property_id: listing.property_id,
            organization_id: blockOrgId,
            start_date: checkIn,
            end_date: checkOut,
            external_uid: event.uid,
            block_type: 'platform_sync',
          })
          // Criar novo bloqueio
          const { error: insertError } = await supabase
            .from('calendar_blocks')
            .insert({
              property_id: listing.property_id,
              organization_id: blockOrgId,
              start_date: checkIn,
              end_date: checkOut,
              notes: event.summary || 'Bloqueado pela plataforma',
              external_uid: event.uid,
              block_type: 'platform_sync',
              property_listing_id: listing.id,
              updated_at: new Date().toISOString(),
            })
          blockError = insertError
          if (blockError) {
            console.error(`[Cron] Erro ao inserir bloqueio ${event.uid}:`, blockError)
          }
        }
      }

      if (!blockError) {
        console.log(`[Cron] ✅ Bloqueio criado/atualizado com sucesso: ${event.uid}`)
        blocked++; processed++; progress.blocked++; progress.processed++
      } else {
        throw new Error(`Falha ao persistir bloqueio ${event.uid}: ${blockError.message}`)
      }
      continue
    }

  }

  let cancelledCount = 0
  {
    try {
      cancelledCount = await cancelMissingReservations({
        supabase,
        propertyListingId: listing.id,
        organizationId: cronOrgId,
        receivedExternalIds,
        receivedCalendarEventIds,
        syncStartedAt,
      })
    } catch (error) {
      console.error(`[Cron] Erro ao cancelar reservas ausentes do iCal para listing ${listing.id}:`, error)
      throw error
    }
  }

  if (cancelledCount > 0) {
    console.log(`[Cron] Listing ${listing.id}: ${cancelledCount} reserva(s) cancelada(s) por ausência no iCal`)
    cancelled += cancelledCount
    progress.cancelled += cancelledCount
  }

  await removeMissingCalendarBlocks({
    supabase, organizationId: cronOrgId, propertyId: listing.property_id,
    propertyListingId: listing.id, receivedUids, syncStartedAt,
  })

  // Update listing with success status and clear error tracking
  const { error: listingUpdateError } = await supabase.from('property_listings').update({
    last_synced_at: new Date().toISOString(),
    last_sync_error: null,
    sync_error_count: 0
  }).eq('id', listing.id)
  if (listingUpdateError) throw new Error(`Falha ao registrar sincronização: ${listingUpdateError.message}`)

  // Story 39.5: registrar sucesso em sync_logs para alimentar o indicador de status no dashboard
  const { error: syncLogError } = await supabase.from('sync_logs').insert({
    property_listing_id: listing.id,
    sync_type: 'ical',
    direction: 'inbound',
    status: 'success',
    records_processed: processed,
    records_created: created,
    records_updated: updated,
    records_failed: 0,
    synced_at: new Date().toISOString(),
  })
  if (syncLogError) {
    throw new Error(`Falha ao registrar resultado da sincronização: ${syncLogError.message}`)
  }

  return { created, updated, blocked, unknown, skipped, cancelled, processed }
}

// Only the initial read is retried: restarting a sync could repeat writes.
async function readSyncListings(supabase: ReturnType<typeof createAdminClient>) {
  const read = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
      return await supabase
        .from('property_listings')
        .select(`id, ical_url, sync_enabled, property_id, platforms(name, display_name), properties:properties!property_listings_property_org_fk(name, organization_id, is_active)`)
        .eq('is_active', true)
        .eq('sync_enabled', true)
        .not('ical_url', 'is', null)
        // Own one retry budget instead of multiplying the client's internal retries.
        .retry(false)
        .abortSignal(controller.signal)
    } finally {
      clearTimeout(timeout)
    }
  }

  let result = await read()
  for (let attempt = 2; result.error && [502, 503, 504, 520].includes(result.status) && attempt <= 3; attempt++) {
    console.warn('[Cron] Retrying initial listings read', { attempt, status: result.status })
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt - 1)))
    result = await read()
  }
  return result
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const isManual = request.nextUrl.searchParams.get('manual') === 'true'

    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log manual sync requests
    if (isManual) {
      console.log('[Cron] 🚀 MANUAL SYNC TRIGGERED by user')
    }

    const supabase = await createAdminClient()

    const { data: listings, error, status } = await readSyncListings(supabase)

    if (error) {
      console.error('[Cron] Erro ao buscar anúncios:', { status, error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter out listings from inactive properties
    const activeListings = (listings || []).filter(listing => {
      const props = listing.properties as unknown as { is_active?: boolean } | null
      return props?.is_active === true
    })

    if (!activeListings || activeListings.length === 0) {
      return NextResponse.json({ message: 'Nenhum anúncio com sincronização ativa', synced: 0 })
    }

    console.log(`[Cron] Fetched ${listings?.length} listings, syncing ${activeListings.length} from active properties`)

    // ── Agrupar por property_id ──────────────────────────────────────────────
    // Listings da mesma propriedade ficam serial (overlap-check seria corrompido
    // por race condition se corressem em paralelo). Propriedades diferentes são
    // independentes → processamento paralelo com Promise.allSettled.
    const listingsByProperty = new Map<string, typeof activeListings>()
    for (const listing of activeListings) {
      const g = listingsByProperty.get(listing.property_id) ?? []
      g.push(listing)
      listingsByProperty.set(listing.property_id, g)
    }

    const settled = await Promise.allSettled(
      Array.from(listingsByProperty.values()).map(async (propListings) => {
        let created = 0, updated = 0, blocked = 0, unknown = 0, skipped = 0, cancelled = 0, errors = 0
        for (const listing of propListings) {
          const progress: SyncResult = { created: 0, updated: 0, blocked: 0, unknown: 0, skipped: 0, cancelled: 0, processed: 0 }
          try {
            const r = await syncOneListing(supabase, listing, progress)
            created += r.created; updated += r.updated
            blocked += r.blocked
            unknown += r.unknown
            skipped += r.skipped; cancelled += r.cancelled
          } catch (err) {
            console.error(`[Cron] Falha no listing ${listing.id}:`, err)
            errors++
            created += progress.created; updated += progress.updated
            blocked += progress.blocked
            unknown += progress.unknown
            skipped += progress.skipped; cancelled += progress.cancelled

            const errorMessage = err instanceof Error ? err.message : String(err)

            // Increment error counter and update last_sync_error on property_listings
            const { data: currentListing } = await supabase
              .from('property_listings')
              .select('sync_error_count')
              .eq('id', listing.id)
              .single()

            const newErrorCount = (currentListing?.sync_error_count || 0) + 1

            await supabase.from('property_listings').update({
              last_sync_error: errorMessage,
              sync_error_count: newErrorCount,
              last_synced_at: new Date().toISOString()
            }).eq('id', listing.id)

            // Story 39.5: registrar falha em sync_logs para alimentar o indicador de status no dashboard
            const { error: syncLogError } = await supabase.from('sync_logs').insert({
              property_listing_id: listing.id,
              sync_type: 'ical',
              direction: 'inbound',
              status: 'failed',
              error_message: errorMessage,
              records_processed: progress.processed,
              records_created: progress.created,
              records_updated: progress.updated,
              records_failed: 1,
              synced_at: new Date().toISOString(),
            })
            if (syncLogError) {
              console.warn(`[Cron] Erro ao registrar sync_log de falha para listing ${listing.id}:`, syncLogError.message)
            }
          }
        }
        return { created, updated, blocked, unknown, skipped, cancelled, errors }
      })
    )

    // ── Agregar resultados ───────────────────────────────────────────────────
    let totalCreated = 0, totalUpdated = 0, totalBlocked = 0, totalUnknown = 0, totalSkipped = 0, totalCancelled = 0, totalErrors = 0

    for (const s of settled) {
      if (s.status === 'fulfilled') {
        totalCreated  += s.value.created
        totalUpdated  += s.value.updated
        totalBlocked  += s.value.blocked
        totalUnknown  += s.value.unknown
        totalSkipped  += s.value.skipped
        totalCancelled += s.value.cancelled
        totalErrors   += s.value.errors
      } else {
        console.error('[Cron] Grupo de propriedade falhou:', s.reason)
        totalErrors++
      }
    }

    const response = {
      success: true,
      mode: isManual ? 'manual' : 'cron',
      synced: listings.length,
      created: totalCreated,
      updated: totalUpdated,
      blocked: totalBlocked,
      unknown: totalUnknown,
      skipped: totalSkipped,
      cancelled: totalCancelled,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
      ...(isManual && {
        message: '✅ Sincronização manual completada',
        details: {
          totalListings: listings.length,
          activeListings: activeListings.length,
          summary: `${totalCreated} reservas criadas, ${totalUpdated} reservas atualizadas, ${totalBlocked} bloqueios, ${totalUnknown} desconhecidas, ${totalSkipped} ignoradas, ${totalErrors} erros`
        }
      })
    }

    if (isManual) {
      console.log('[Cron] ✅ Manual sync completed:', response)
    }

    return NextResponse.json(response)

  } catch (error: unknown) {
    console.error('[Cron] Erro no cron job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
