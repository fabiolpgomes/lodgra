import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, classifyICalEvent } from '@/lib/ical/icalService'
import { requireRole } from '@/lib/auth/requireRole'
import { detectSource } from '@/lib/ical/bookingParser'
import {
  buildReservationExternalIdContext,
  cancelMissingReservations,
  removeMissingCalendarBlocks,
} from '@/lib/ical/reservationSync'
import { upsertCalendarEventAudit } from '@/lib/ical/calendarEventAudit'
import { importPendingICalReservation } from '@/lib/ical/pendingReservation'

type AdminClient = ReturnType<typeof createAdminClient>

interface PropertyInfo {
  name: string
  owner_id: string | null
  organization_id?: string | null
}

async function syncListing(
  supabase: AdminClient,
  listingId: string,
  icalUrl: string,
  organizationId?: string
): Promise<{ created: number; updated: number; blocked: number; reconciled: number; unknown: number; skipped: number; cancelled: number; errors: string[] }> {
  const syncStartedAt = new Date().toISOString()
  const events = await importICalFromUrl(icalUrl)
  const receivedUids = new Set(events.map(event => event.uid))

  const { data: propertyListing, error: propertyListingError } = await supabase
    .from('property_listings')
    .select('property_id, organization_id')
    .eq('id', listingId)
    .single()

  if (propertyListingError || !propertyListing?.property_id) {
    throw new Error(
      `Anúncio ${listingId} inválido: ${propertyListingError?.message || 'property_id ausente'}`
    )
  }

  const resolvedOrganizationId = propertyListing.organization_id || organizationId
  if (!resolvedOrganizationId) {
    throw new Error(`Anúncio ${listingId} sem organization_id para auditar evento iCal`)
  }

  let created = 0
  let updated = 0
  let blocked = 0
  const reconciled = 0
  let unknown = 0
  let skipped = 0
  let cancelled = 0
  const errors: string[] = []
  console.log(`[Sync] Listing ${listingId}: ${events.length} evento(s) recebido(s) do iCal`)
  const receivedExternalIds = new Set<string>()
  const receivedCalendarEventIds = new Set<string>()

  if (events.length === 0) {
    console.warn(`[Sync] Listing ${listingId}: iCal retornou 0 eventos — verifique a URL ou se o calendário tem reservas`)
  }

  // FILTRO de datas: usar UTC para consistência com datas UTC do icalService
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const twoYearsFromNow = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()))

  for (const event of events) {
    const externalIdContext = buildReservationExternalIdContext(event)

    const source = detectSource(event.summary, event.description, event.uid)
    const auditOrganizationId = resolvedOrganizationId

    // Usar toISOString() para obter YYYY-MM-DD em UTC (consistente com Date.UTC usado no icalService)
    const checkIn = event.start.toISOString().split('T')[0]
    const checkOut = event.end.toISOString().split('T')[0]

    const classification = classifyICalEvent(event)
    const audit = await upsertCalendarEventAudit({
      supabase,
      organizationId: auditOrganizationId,
      propertyId: propertyListing.property_id,
      propertyListingId: listingId,
      sourcePlatform: source,
      event,
      classification,
    })

    receivedCalendarEventIds.add(audit.id)
    for (const candidate of externalIdContext.externalIdCandidates) receivedExternalIds.add(candidate)

    // Ignorar se o check-out já passou (reserva terminada) ou início > 2 anos
    if (event.end < today || event.start > twoYearsFromNow) {
      console.log(`[Sync] Evento ignorado por data (${checkIn}-${checkOut}): "${event.summary}"`)
      skipped++
      continue
    }

    if (
      (source === 'booking' || classification === 'reservation' ||
        audit.status === 'matched' || audit.status === 'ignored') &&
      classification !== 'unknown'
    ) {
      const pending = await importPendingICalReservation(supabase, auditOrganizationId, audit.id, externalIdContext.externalIdCandidates)
      receivedExternalIds.add(`ical_${audit.id}`)
      if (pending.action === 'created') created++
      else if (pending.action === 'updated') updated++
      else if (pending.action === 'blocked') blocked++
      else skipped++
      continue
    }

    if (classification === 'unknown') {
      console.log(`[Sync] Evento sem evidência suficiente para classificar: "${event.summary}" (${event.uid})`)
      unknown++
      continue
    }

    if (classification === 'block') {
      const { data: existingBlock, error: existingBlockError } = await supabase
        .from('calendar_blocks')
        .select('id')
        .eq('external_uid', event.uid)
        .eq('property_id', propertyListing.property_id)
        .eq('organization_id', auditOrganizationId)
        .eq('property_listing_id', listingId)
        .maybeSingle()

      if (existingBlockError) {
        const blockError = `Falha ao localizar bloqueio para "${event.summary}" (${checkIn} → ${checkOut}): ${existingBlockError.message}`
        console.error('[Sync]', blockError)
        errors.push(blockError)
        skipped++
        continue
      }

      if (existingBlock) {
        const { error: blockUpdateError } = await supabase
          .from('calendar_blocks')
          .update({
            start_date: checkIn,
            end_date: checkOut,
            notes: event.summary || 'Data bloqueada',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBlock.id)

        if (blockUpdateError) {
          const blockError = `Falha ao atualizar bloqueio para "${event.summary}" (${checkIn} → ${checkOut}): ${blockUpdateError.message}`
          console.error('[Sync]', blockError)
          errors.push(blockError)
          skipped++
        } else {
          blocked++
        }
      } else {
        const { error: blockInsertError } = await supabase
          .from('calendar_blocks')
          .insert({
            property_id: propertyListing.property_id,
            organization_id: auditOrganizationId,
            start_date: checkIn,
            end_date: checkOut,
            notes: event.summary || 'Data bloqueada',
            external_uid: event.uid || null,
            block_type: 'platform_sync',
            property_listing_id: listingId,
          })

        if (blockInsertError) {
          const blockError = `Falha ao criar bloqueio para "${event.summary}" (${checkIn} → ${checkOut}): ${blockInsertError.message}`
          console.error('[Sync]', blockError)
          errors.push(blockError)
          skipped++
        } else {
          blocked++
        }
      }
      continue
    }

  }

  let cancelledCount = 0
  if (errors.length) throw new Error(errors.join("; "))
  {
    try {
      cancelledCount = await cancelMissingReservations({
        supabase,
        propertyListingId: listingId,
        organizationId: resolvedOrganizationId,
        receivedExternalIds,
        receivedCalendarEventIds,
        syncStartedAt,
      })
    } catch (error) {
      console.error(`[Sync] Erro ao cancelar reservas ausentes do iCal para listing ${listingId}:`, error)
      throw error
    }
  }

  if (cancelledCount > 0) {
    console.log(`[Sync] Listing ${listingId}: ${cancelledCount} reserva(s) cancelada(s) por ausência no iCal`)
    cancelled += cancelledCount
  }

  await removeMissingCalendarBlocks({
    supabase, organizationId: resolvedOrganizationId, propertyId: propertyListing.property_id,
    propertyListingId: listingId, receivedUids, syncStartedAt,
  })

  // Atualizar last_synced_at do listing
  const { error: listingUpdateError } = await supabase
    .from('property_listings')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', listingId)
  if (listingUpdateError) throw new Error(`Falha ao registrar sincronização: ${listingUpdateError.message}`)

  // Story 39.5: registrar sucesso em sync_logs para alimentar o indicador de status no dashboard
  const { error: syncLogError } = await supabase.from('sync_logs').insert({
    property_listing_id: listingId,
    sync_type: 'ical',
    direction: 'inbound',
    status: 'success',
    synced_at: new Date().toISOString(),
  })
  if (syncLogError) {
    throw new Error(`Falha ao registrar resultado da sincronização: ${syncLogError.message}`)
  }

  return { created, updated, blocked, reconciled, unknown, skipped, cancelled, errors }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    // Usar admin client para bypass de RLS nas operações de escrita
    const supabase = await createAdminClient()

    // Modo novo: sync por propriedade(s)
    if (body.property_ids && Array.isArray(body.property_ids) && body.property_ids.length > 0) {
      // Buscar listings ativos com iCal URL das propriedades selecionadas
      const { data: listings, error: listingsError } = await supabase
        .from('property_listings')
        .select(`
          id,
          ical_url,
          property_id,
          properties:properties!property_listings_property_org_fk(
            id,
            name,
            organization_id
          )
        `)
        .eq('is_active', true)
        .not('ical_url', 'is', null)
        .in('property_id', body.property_ids)

      if (listingsError) {
        return NextResponse.json(
          { error: 'Erro ao buscar anúncios: ' + listingsError.message },
          { status: 500 }
        )
      }

      if (!listings || listings.length === 0) {
        return NextResponse.json(
          { error: 'Nenhum anúncio com URL iCal encontrado para as propriedades selecionadas' },
          { status: 404 }
        )
      }

      // ── Agrupar listings por propriedade ─────────────────────────────────
      // Listings da mesma propriedade processados em série (overlap-check
      // seria corrompido por race condition em paralelo).
      // Propriedades diferentes são independentes → parallelismo seguro.
      const listingsByProperty = new Map<string, typeof listings>()
      for (const listing of listings) {
        const g = listingsByProperty.get(listing.property_id) ?? []
        g.push(listing)
        listingsByProperty.set(listing.property_id, g)
      }

      const settled = await Promise.allSettled(
        Array.from(listingsByProperty.entries()).map(async ([propId, propListings]) => {
          const propName = (propListings[0].properties as unknown as PropertyInfo).name
          const propResult = {
            property_id: propId,
            property_name: propName,
            created: 0, updated: 0, blocked: 0, reconciled: 0, unknown: 0, skipped: 0, cancelled: 0,
            errors: [] as string[],
          }
          for (const listing of propListings) {
            try {
              const propOrgId = (listing.properties as unknown as PropertyInfo)?.organization_id as string | undefined
              console.log(`[Sync] Listing ${listing.id}`)
              const r = await syncListing(supabase, listing.id, listing.ical_url, propOrgId)
              propResult.created   += r.created
              propResult.updated   += r.updated
              propResult.blocked   += r.blocked
              propResult.reconciled += r.reconciled
              propResult.unknown   += r.unknown
              propResult.skipped   += r.skipped
              propResult.cancelled += r.cancelled
              propResult.errors.push(...r.errors)
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err)
              const msg = `Listing ${listing.id}: ${errorMessage}`
              console.error(`[Sync] ${msg}`)
              propResult.errors.push(msg)

              // Story 39.5: registrar falha em sync_logs para alimentar o indicador de status no dashboard
              const { error: syncLogError } = await supabase.from('sync_logs').insert({
                property_listing_id: listing.id,
                sync_type: 'ical',
                direction: 'inbound',
                status: 'failed',
                error_message: errorMessage,
                synced_at: new Date().toISOString(),
              })
              if (syncLogError) {
                console.warn(`[Sync] Erro ao registrar sync_log de falha para listing ${listing.id}:`, syncLogError.message)
              }
            }
          }
          return propResult
        })
      )

      type PropResult = { property_id: string; property_name: string; created: number; updated: number; blocked: number; reconciled: number; unknown: number; skipped: number; cancelled: number; errors: string[] }
      const results: PropResult[] = []
      for (const s of settled) {
        if (s.status === 'fulfilled') results.push(s.value)
        else console.error('[Sync] Grupo de propriedade falhou:', s.reason)
      }

      const allErrors = results.flatMap(r => r.errors)
      const totals = results.reduce(
        (acc, r) => ({
          created: acc.created + r.created,
          updated: acc.updated + r.updated,
          blocked: acc.blocked + r.blocked,
          reconciled: acc.reconciled + r.reconciled,
          unknown: acc.unknown + r.unknown,
          skipped: acc.skipped + r.skipped,
          cancelled: acc.cancelled + r.cancelled,
        }),
        { created: 0, updated: 0, blocked: 0, reconciled: 0, unknown: 0, skipped: 0, cancelled: 0 }
      )

      return NextResponse.json({
        success: true,
        results,
        totals,
        errors: allErrors.length > 0 ? allErrors : undefined,
      })
    }

    // Modo legado: sync por URL + property_id + listing_id
    const { url, property_id, listing_id } = body

    if (!url || !property_id || !listing_id) {
      return NextResponse.json(
        { error: 'URL, property_id e listing_id são obrigatórios' },
        { status: 400 }
      )
    }

    const adminSupabase = await createAdminClient()

    const { data: legacyListing, error: legacyListingError } = await adminSupabase
      .from('property_listings')
      .select('id, property_id')
      .eq('id', listing_id)
      .eq('property_id', property_id)
      .maybeSingle()

    if (legacyListingError) {
      return NextResponse.json({ error: 'Erro ao validar anúncio: ' + legacyListingError.message }, { status: 500 })
    }
    if (!legacyListing) {
      return NextResponse.json({ error: 'Anúncio não encontrado para esta propriedade' }, { status: 404 })
    }

    // Buscar org_id via propriedade
    const { data: propData } = await adminSupabase
      .from('properties')
      .select('organization_id')
      .eq('id', property_id)
      .single()
    const legacyOrgId = propData?.organization_id as string | undefined

    let result
    try {
      result = await syncListing(adminSupabase, listing_id, url, legacyOrgId)
    } catch (err: unknown) {
      // Story 39.5: registrar falha em sync_logs para alimentar o indicador de status no dashboard
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[Sync] Falha no listing ${listing_id}:`, err)
      const { error: syncLogError } = await adminSupabase.from('sync_logs').insert({
        property_listing_id: listing_id,
        sync_type: 'ical',
        direction: 'inbound',
        status: 'failed',
        error_message: errorMessage,
        synced_at: new Date().toISOString(),
      })
      if (syncLogError) {
        console.warn(`[Sync] Erro ao registrar sync_log de falha para listing ${listing_id}:`, syncLogError.message)
      }
      return NextResponse.json(
        { error: 'Erro ao importar calendário: ' + errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...result,
      total: result.created + result.updated + result.blocked + result.reconciled + result.skipped + result.unknown,
    })
  } catch (error: unknown) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: 'Erro ao importar calendário' },
      { status: 500 }
    )
  }
}
