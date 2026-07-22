import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl, isBlockedEvent } from '@/lib/ical/icalService'
import { enqueueEmail } from '@/lib/email/queue'
import {
  parseBookingDescription,
  detectSource,
  buildStableExternalId,
  extractBookingGuestData,
  extractAirbnbGuestData,
  extractVrboGuestData,
  extractFlatioGuestData,
  getPlatformUrl,
} from '@/lib/ical/bookingParser'

interface ListingPropertyInfo {
  name: string
  organization_id: string | null
}

interface CronReservationGuestRow {
  id: string
  external_id: string | null
  check_in: string
  check_out: string
  guests: { first_name: string; last_name: string } | null
}

export const dynamic = 'force-dynamic'

// ─── Per-listing sync logic ───────────────────────────────────────────────────

type SyncResult = { created: number; updated: number; skipped: number; cancelled: number }

async function syncOneListing(
  supabase: ReturnType<typeof createAdminClient>,
  listing: {
    id: string
    ical_url: string
    property_id: string
    sync_enabled: boolean
    properties: unknown
  }
): Promise<SyncResult> {
  let created = 0, updated = 0, skipped = 0
  const cancelled = 0

  // Extract organization_id from listing (needed for both reservations and blocks)
  const cronOrgId = (listing.properties as unknown as { organization_id?: string })?.organization_id as string | undefined

  console.log(`[Cron] Sincronizando anúncio ${listing.id}...`)
  const events = await importICalFromUrl(listing.ical_url)
  console.log(`[Cron] Listing ${listing.id}: ${events.length} evento(s)`)
  const receivedUids = new Set(events.map(e => e.uid))

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const twoYearsFromNow = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()))

  for (const event of events) {
    const checkIn = event.start.toISOString().split('T')[0]
    const checkOut = event.end.toISOString().split('T')[0]

    // ENHANCED LOGGING: Platform-specific detection
    const isBlocked = isBlockedEvent(event)

    // Log suspicious patterns (potential misclassification)
    if (event.uid?.includes('@booking.com') && event.description?.includes('BOOKING ID')) {
      // Booking.com RESERVATION with structured data
      if (isBlocked) {
        console.warn(`[⚠️ Cron] SUSPICIOUS: Booking.com with BOOKING ID detected as BLOCK!`, {
          summary: event.summary,
          uid: event.uid?.substring(0, 50),
          description: event.description?.substring(0, 100),
          isBlocked,
        })
      }
    }

    if (event.uid?.includes('@airbnb.com') && event.summary === 'Reserved') {
      // Airbnb RESERVATION
      if (isBlocked) {
        console.warn(`[⚠️ Cron] SUSPICIOUS: Airbnb "Reserved" detected as BLOCK!`, {
          uid: event.uid?.substring(0, 50),
          isBlocked,
        })
      }
    }

    // Standard logging
    console.log(`[Cron] Event classification:`, {
      summary: event.summary?.substring(0, 50),
      uid: event.uid?.substring(0, 50),
      checkIn,
      checkOut,
      classification: isBlocked ? 'BLOCK' : 'RESERVATION',
      durationDays: Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)),
    })

    if (event.end < today || event.start > twoYearsFromNow) {
      if (isBlockedEvent(event)) {
        console.log(`[Cron] Bloqueio fora do intervalo (antes ${today} ou depois ${twoYearsFromNow}): "${event.summary}"`)
      }
      skipped++;
      continue
    }

    const durationDays = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24))
    if (durationDays > 180) {
      console.log(`[Cron] Evento sazonal (${durationDays}d) ignorado: "${event.summary}"`)
      skipped++; continue
    }

    // Check if this event is a blocked/unavailable date (not a guest reservation)
    if (isBlockedEvent(event)) {
      console.log(`[Cron] Bloqueio detectado para listing ${listing.id}:`, {
        summary: event.summary,
        uid: event.uid,
        checkIn,
        checkOut,
        propertyId: listing.property_id,
        cronOrgId,
      })

      // Create or update block instead of reservation
      // Fallback: fetch organization from property if cronOrgId is missing
      let blockOrgId = cronOrgId
      if (!blockOrgId) {
        const { data: prop } = await supabase
          .from('properties')
          .select('organization_id')
          .eq('id', listing.property_id)
          .single()
        blockOrgId = prop?.organization_id
        console.log(`[Cron] Fetched organization_id for property ${listing.property_id}: ${blockOrgId}`)
      }

      // Verificar se bloqueio já existe (pelo external_uid)
      let blockError = null
      if (event.uid) {
        const { data: existing, error: existingError } = await supabase
          .from('calendar_blocks')
          .select('id')
          .eq('external_uid', event.uid)
          .single()

        if (existingError) {
          console.log(`[Cron] Bloqueio ${event.uid} não existe (será criado novo)`)
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
            })
            .eq('external_uid', event.uid)
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
            })
          blockError = insertError
          if (blockError) {
            console.error(`[Cron] Erro ao inserir bloqueio ${event.uid}:`, blockError)
          }
        }
      }

      if (!blockError) {
        console.log(`[Cron] ✅ Bloqueio criado/atualizado com sucesso: ${event.uid}`)
      } else {
        console.error(`[Cron] ❌ Erro ao processar bloqueio ${event.uid}: ${blockError.message}`)
      }
      continue
    }

    // ─── Construir external_id usando formato estável: plataforma_numero ───────
    const source = detectSource(event.summary, event.description)
    const externalIdLookup = buildStableExternalId(event.uid, event.description, source)

    if (externalIdLookup !== event.uid) {
      console.log(`[Cron] External ID estável construído: ${externalIdLookup}`)
    }

    // ─── Extrair dados estruturados ANTES de usar em UPDATE/INSERT ─────────────
    // booking_reference e platform metadata
    const bookingReference = externalIdLookup.includes('_')
      ? externalIdLookup.substring(externalIdLookup.indexOf('_') + 1)
      : externalIdLookup

    // Guest data real baseado na plataforma (não genérico!)
    let guestData = null
    let platformUrl = ''
    const bookingData = parseBookingDescription(event.description)

    if (source === 'booking') {
      guestData = extractBookingGuestData(event.description)
      platformUrl = getPlatformUrl('booking', bookingReference)
    } else if (source === 'airbnb') {
      guestData = extractAirbnbGuestData(event.summary)
      platformUrl = getPlatformUrl('airbnb', bookingReference)
    } else if (externalIdLookup.includes('vrbo')) {
      guestData = extractVrboGuestData(event.description)
      platformUrl = getPlatformUrl('vrbo', bookingReference)
    } else if (externalIdLookup.includes('flatio')) {
      guestData = extractFlatioGuestData(event.description)
      platformUrl = getPlatformUrl('flatio', bookingReference)
    }

    const { data: existingReservation } = await supabase
      .from('reservations').select('id').eq('external_id', externalIdLookup).single()

    if (existingReservation) {
      console.log(`[Cron] Atualizando reserva existente com external_id: ${externalIdLookup}`)
      const { error } = await supabase
        .from('reservations')
        .update({
          check_in: checkIn,
          check_out: checkOut,
          updated_at: new Date().toISOString(),
          external_id: externalIdLookup,

          // Story 36.2: Atualizar platform metadata também
          booking_reference: bookingReference,
          booking_source: source === 'booking' ? 'booking' : source === 'airbnb' ? 'airbnb' : 'ical_import',
          platform_sync_url: platformUrl || null,
          platform_synced_at: new Date().toISOString(),

          ...(bookingData.numGuests ? { number_of_guests: bookingData.numGuests } : {}),
          ...(guestData?.guests ? { number_of_guests: guestData.guests } : {}),
        })
        .eq('id', existingReservation.id)
      if (error) {
        console.error(`[Cron] Erro ao atualizar reserva ${externalIdLookup}:`, error)
        skipped++
      } else {
        updated++
      }
    } else {
      // Buscar siblings da mesma propriedade para overlap check
      const { data: siblingListings } = await supabase
        .from('property_listings').select('id').eq('property_id', listing.property_id)
      const siblingIds = siblingListings?.map(l => l.id) || [listing.id]
      if (siblingIds.length === 0) siblingIds.push(listing.id)

      const { data: overlapping } = await supabase
        .from('reservations').select('id')
        .in('property_listing_id', siblingIds)
        .not('status', 'eq', 'cancelled')
        .lt('check_in', checkOut).gt('check_out', checkIn)

      if (overlapping && overlapping.length > 0) { skipped++; continue }

      // Fallback: usar summary ou genérico
      let guestFirstName = guestData?.firstName || 'Hóspede'
      let guestLastName = guestData?.lastName || 'Importado'

      // Se não temos nome real, tentar extrair do summary
      if (guestFirstName === 'Hóspede' && guestLastName === 'Importado') {
        const summary = event.summary || ''
        if (summary && !summary.toLowerCase().includes('not available') && !summary.toLowerCase().includes('closed')) {
          const parts = summary.split(' ')
          if (parts.length >= 2) {
            guestFirstName = parts[0]
            guestLastName = parts.slice(1).join(' ')
          } else if (parts.length === 1) {
            guestFirstName = parts[0]
            guestLastName = ''
          }
        }
      }

      // Email: só gera fake se não temos email real
      const uniqueEmail = guestData?.email || `imported-${Date.now()}-${Math.random().toString(36).substring(7)}@lodgra.local`

      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert({
          first_name: guestFirstName,
          last_name: guestLastName,
          email: uniqueEmail,
          phone: bookingData.phone || null,
          country: bookingData.country || null,
          ...(cronOrgId ? { organization_id: cronOrgId } : {})
        })
        .select().single()

      if (guestError || !guest) { skipped++; continue }

      console.log(`[Cron] Criando nova reserva com external_id: ${externalIdLookup}`)
      const { error: resError } = await supabase
        .from('reservations')
        .insert({
          property_listing_id: listing.id,
          guest_id: guest.id,
          check_in: checkIn,
          check_out: checkOut,
          status: 'confirmed',
          external_id: externalIdLookup,

          // Story 36.2: Platform booking IDs estruturados
          booking_reference: bookingReference,
          booking_source: source === 'booking' ? 'booking' : source === 'airbnb' ? 'airbnb' : 'ical_import',
          platform_sync_url: platformUrl || null,
          platform_synced_at: new Date().toISOString(),

          source: source === 'booking' ? 'booking' : source === 'airbnb' ? 'airbnb' : 'ical_import',
          number_of_guests: guestData?.guests || bookingData.numGuests || 1,
          commission_calculated_at: new Date().toISOString(),
          ...(cronOrgId ? { organization_id: cronOrgId } : {})
        })

      if (resError) { skipped++ } else {
        created++
        // Notificar proprietário via queue
        const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
        const propName = (listing.properties as unknown as { name: string } | null)?.name
        if (listing.property_id) {
          const { data: propDetail } = await supabase.from('properties').select('owner_id').eq('id', listing.property_id).single()
          if (propDetail?.owner_id) {
            const { data: owner } = await supabase.from('owners').select('full_name, email').eq('id', propDetail.owner_id).single()
            if (owner?.email) {
              enqueueEmail({
                type: 'owner_reservation',
                ownerName: owner.full_name, ownerEmail: owner.email,
                guestName: `${guestFirstName} ${guestLastName}`.trim(),
                propertyName: propName || 'Propriedade', checkIn, checkOut, nights, source: 'ical_auto_sync',
              }).catch(err => console.error('[Cron] Erro ao enfileirar notificação de reserva:', err))
            }
          }
        }
      }
    }
  }

  // ❌ REMOVED: Auto-cancel logic that incorrectly cancelled active reservations
  // Issue: Absence from iCal doesn't mean removal from platform
  // Possible causes: UID mismatch, parsing error, timeout, platform glitch
  // Risk: Cancels active reservations = OVERBOOKING
  // Solution: Manual review required for cancellations (webhook push already handles real cancellations)
  console.log(`[Cron] Listing ${listing.id}: Auto-cancel logic disabled (safety measure)`)

  // Auto-remove blocks that disappeared from iCal
  const { data: existingBlocks } = await supabase
    .from('calendar_blocks')
    .select('id, external_uid')
    .eq('property_id', listing.property_id)
    .not('external_uid', 'is', null) // Only platform-synced blocks

  if (existingBlocks) {
    for (const block of existingBlocks) {
      // Skip past blocks — platforms remove them from iCal after check-out
      if (block.external_uid && !receivedUids.has(block.external_uid)) {
        const { error: deleteError } = await supabase
          .from('calendar_blocks')
          .delete()
          .eq('id', block.id)

        if (!deleteError) {
          console.log(`[Cron] Bloqueio removido (não mais no iCal): ${block.external_uid}`)
        }
      }
    }
  }

  await supabase.from('property_listings').update({ last_synced_at: new Date().toISOString() }).eq('id', listing.id)

  return { created, updated, skipped, cancelled }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    const { data: listings, error } = await supabase
      .from('property_listings')
      .select(`id, ical_url, sync_enabled, property_id, properties!inner(name, organization_id)`)
      .eq('is_active', true).eq('sync_enabled', true).not('ical_url', 'is', null)

    if (error) {
      console.error('[Cron] Erro ao buscar anúncios:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ message: 'Nenhum anúncio com sincronização ativa', synced: 0 })
    }

    // ── Agrupar por property_id ──────────────────────────────────────────────
    // Listings da mesma propriedade ficam serial (overlap-check seria corrompido
    // por race condition se corressem em paralelo). Propriedades diferentes são
    // independentes → processamento paralelo com Promise.allSettled.
    const listingsByProperty = new Map<string, typeof listings>()
    for (const listing of listings) {
      const g = listingsByProperty.get(listing.property_id) ?? []
      g.push(listing)
      listingsByProperty.set(listing.property_id, g)
    }

    const settled = await Promise.allSettled(
      Array.from(listingsByProperty.values()).map(async (propListings) => {
        let created = 0, updated = 0, skipped = 0, cancelled = 0, errors = 0
        for (const listing of propListings) {
          try {
            const r = await syncOneListing(supabase, listing)
            created += r.created; updated += r.updated
            skipped += r.skipped; cancelled += r.cancelled
          } catch (err) {
            console.error(`[Cron] Falha no listing ${listing.id}:`, err)
            errors++
          }
        }
        return { created, updated, skipped, cancelled, errors }
      })
    )

    // ── Agregar resultados ───────────────────────────────────────────────────
    let totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalCancelled = 0, totalErrors = 0

    for (const s of settled) {
      if (s.status === 'fulfilled') {
        totalCreated  += s.value.created
        totalUpdated  += s.value.updated
        totalSkipped  += s.value.skipped
        totalCancelled += s.value.cancelled
        totalErrors   += s.value.errors
      } else {
        console.error('[Cron] Grupo de propriedade falhou:', s.reason)
        totalErrors++
      }
    }

    return NextResponse.json({
      success: true,
      synced: listings.length,
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      cancelled: totalCancelled,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    })

  } catch (error: unknown) {
    console.error('[Cron] Erro no cron job:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
