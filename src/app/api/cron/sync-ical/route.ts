import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl } from '@/lib/ical/icalService'
import { enqueueEmail } from '@/lib/email/queue'
import { parseBookingDescription, detectSource } from '@/lib/ical/bookingParser'

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
  let created = 0, updated = 0, skipped = 0, cancelled = 0

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

    if (event.end < today || event.start > twoYearsFromNow) { skipped++; continue }

    const durationDays = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24))
    if (durationDays > 180) {
      console.log(`[Cron] Evento sazonal (${durationDays}d) ignorado: "${event.summary}"`)
      skipped++; continue
    }

    const { data: existingReservation } = await supabase
      .from('reservations').select('id').eq('external_id', event.uid).single()

    if (existingReservation) {
      const { error } = await supabase
        .from('reservations')
        .update({ check_in: checkIn, check_out: checkOut, updated_at: new Date().toISOString() })
        .eq('id', existingReservation.id)
      if (error) { skipped++ } else { updated++ }
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

      const uniqueEmail = `imported-${Date.now()}-${Math.random().toString(36).substring(7)}@lodgra.local`

      // Parse Booking.com metadata from description
      const bookingData = parseBookingDescription(event.description)
      const source = detectSource(event.summary, event.description)

      let guestFirstName = bookingData.guestName?.split(' ')[0] || 'Hóspede'
      let guestLastName = bookingData.guestName?.split(' ').slice(1).join(' ') || 'Importado'

      const summary = event.summary || ''
      if (summary && !summary.toLowerCase().includes('not available') && !summary.toLowerCase().includes('closed')) {
        const parts = summary.split(' ')
        if (parts.length >= 2) { guestFirstName = parts[0]; guestLastName = parts.slice(1).join(' ') }
        else if (parts.length === 1) { guestFirstName = parts[0]; guestLastName = '' }
      }

      const cronOrgId = (listing.properties as unknown as ListingPropertyInfo)?.organization_id as string | undefined

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

      const { error: resError } = await supabase
        .from('reservations')
        .insert({
          property_listing_id: listing.id, guest_id: guest.id,
          check_in: checkIn, check_out: checkOut,
          status: 'confirmed', external_id: event.uid,
          booking_source: 'ical_auto_sync',
          source: source === 'booking' ? 'booking' : source === 'airbnb' ? 'airbnb' : 'ical_import',
          number_of_guests: bookingData.numGuests || 1,
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

  // Auto-cancelar reservas que desapareceram do iCal
  if (receivedUids.size > 0) {
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('id, external_id, check_in, check_out, guests:guest_id(first_name, last_name)')
      .eq('property_listing_id', listing.id)
      .in('booking_source', ['ical_import', 'ical_auto_sync'])
      .eq('status', 'confirmed')
      .not('external_id', 'is', null)

    if (existingReservations) {
      const today = new Date().toISOString().split('T')[0]
      for (const res of existingReservations) {
        // Skip past reservations — platforms remove them from iCal after checkout
        if (res.check_out < today) continue
        if (!receivedUids.has(res.external_id)) {
          const { error: cancelError } = await supabase
            .from('reservations')
            .update({ status: 'cancelled', cancellation_reason: 'Removida da plataforma (iCal)', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', res.id)

          if (!cancelError) {
            cancelled++
            const propName = (listing.properties as unknown as ListingPropertyInfo)?.name
            if (listing.property_id) {
              const { data: propDetail } = await supabase.from('properties').select('owner_id').eq('id', listing.property_id).single()
              if (propDetail?.owner_id) {
                const { data: owner } = await supabase.from('owners').select('full_name, email').eq('id', propDetail.owner_id).single()
                if (owner?.email) {
                  const guest = (res as unknown as CronReservationGuestRow).guests
                  const cancelledGuestName = guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Hóspede'
                  const cancelledNights = Math.ceil((new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24))
                  enqueueEmail({
                    type: 'owner_cancellation',
                    ownerName: owner.full_name, ownerEmail: owner.email, guestName: cancelledGuestName,
                    propertyName: propName || 'Propriedade', checkIn: res.check_in, checkOut: res.check_out,
                    nights: cancelledNights, cancellationReason: 'Removida da plataforma (iCal)', source: 'ical_auto_sync',
                  }).catch(err => console.error('[Cron] Erro ao enfileirar notificação de cancelamento:', err))
                }
              }
            }
          }
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

    const supabase = createAdminClient()

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
