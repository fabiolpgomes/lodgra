import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { importICalFromUrl } from '@/lib/ical/icalService'
import { requireRole } from '@/lib/auth/requireRole'
import { enqueueEmail } from '@/lib/email/queue'
import { parseBookingDescription, detectSource } from '@/lib/ical/bookingParser'

type AdminClient = ReturnType<typeof createAdminClient>

interface PropertyInfo {
  name: string
  owner_id: string | null
  organization_id?: string | null
}

interface CancelledReservationGuestRow {
  id: string
  external_id: string
  check_in: string
  check_out: string
  guests: { first_name: string; last_name: string } | null
}

async function syncListing(
  supabase: AdminClient,
  listingId: string,
  icalUrl: string,
  organizationId?: string
): Promise<{ created: number; updated: number; skipped: number; cancelled: number; errors: string[] }> {
  const events = await importICalFromUrl(icalUrl)

  let created = 0
  let updated = 0
  let skipped = 0
  let cancelled = 0
  const errors: string[] = []
  console.log(`[Sync] Listing ${listingId}: ${events.length} evento(s) recebido(s) do iCal`)

  if (events.length === 0) {
    console.warn(`[Sync] Listing ${listingId}: iCal retornou 0 eventos — verifique a URL ou se o calendário tem reservas`)
  }

  // Colecionar UIDs dos eventos recebidos para detetar remoções
  const receivedUids = new Set(events.map(e => e.uid))

  // FILTRO de datas: usar UTC para consistência com datas UTC do icalService
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const twoYearsFromNow = new Date(Date.UTC(now.getUTCFullYear() + 2, now.getUTCMonth(), now.getUTCDate()))

  for (const event of events) {
    const { data: existingReservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('external_id', event.uid)
      .single()

    // Usar toISOString() para obter YYYY-MM-DD em UTC (consistente com Date.UTC usado no icalService)
    const checkIn = event.start.toISOString().split('T')[0]
    const checkOut = event.end.toISOString().split('T')[0]

    // Ignorar se o check-out já passou (reserva terminada) ou início > 2 anos
    if (event.end < today || event.start > twoYearsFromNow) {
      console.log(`[Sync] Evento ignorado por data (${checkIn}-${checkOut}): "${event.summary}"`)
      skipped++
      continue
    }

    // Ignorar eventos de duração excessiva (> 180 dias) — são fechamentos sazonais, não reservas reais
    const durationDays = Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24))
    if (durationDays > 180) {
      console.log(`[Sync] Evento de ${durationDays} dias ignorado (fechamento sazonal): "${event.summary}" (${checkIn} → ${checkOut})`)
      skipped++
      continue
    }

    if (existingReservation) {
      const { error } = await supabase
        .from('reservations')
        .update({
          check_in: checkIn,
          check_out: checkOut,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingReservation.id)

      if (error) {
        const errMsg = `Erro ao atualizar reserva ${existingReservation.id}: ${error.message}`
        console.error('[Sync]', errMsg)
        errors.push(errMsg)
        skipped++
      } else {
        updated++
      }
    } else {
      // Verificar se já existe reserva com datas sobrepostas na mesma propriedade
      // (pode ser a mesma reserva importada de outra plataforma)
      const { data: propertyListing } = await supabase
        .from('property_listings')
        .select('property_id')
        .eq('id', listingId)
        .single()

      if (propertyListing) {
        // Buscar listings da mesma propriedade
        const { data: siblingListings } = await supabase
          .from('property_listings')
          .select('id')
          .eq('property_id', propertyListing.property_id)

        const siblingIds = siblingListings?.map((l: { id: string }) => l.id) || []

        // Garantir que o listing atual está na lista (fallback se query retornar vazio)
        if (siblingIds.length === 0) siblingIds.push(listingId)

        // Verificar sobreposição REAL com reservas existentes na mesma propriedade
        // Usar < e > (estrito) para que check-out == check-in NÃO seja sobreposição
        // (saída de um hóspede e entrada de outro no mesmo dia é válido)
        const { data: overlapping } = await supabase
          .from('reservations')
          .select('id, external_id, property_listing_id')
          .in('property_listing_id', siblingIds)
          .not('status', 'eq', 'cancelled')
          .lt('check_in', checkOut)
          .gt('check_out', checkIn)

        if (overlapping && overlapping.length > 0) {
          // Já existe reserva neste período nesta propriedade — mesmo bloqueio de outra plataforma
          console.log(`[Sync] Reserva sobreposta encontrada para "${event.summary}" (${checkIn}-${checkOut}), ignorando duplicado`)
          skipped++
          continue
        }
      }

      const uniqueEmail = `imported-${Date.now()}-${Math.random().toString(36).substring(7)}@lodgra.local`

      // Parse Booking.com metadata from description
      const bookingData = parseBookingDescription(event.description)
      const source = detectSource(event.summary, event.description)

      // Extrair nome do hóspede do summary quando possível
      let guestFirstName = bookingData.guestName?.split(' ')[0] || 'Hóspede'
      let guestLastName = bookingData.guestName?.split(' ').slice(1).join(' ') || 'Importado'

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

      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert({
          first_name: guestFirstName,
          last_name: guestLastName,
          email: uniqueEmail,
          phone: bookingData.phone || null,
          country: bookingData.country || null,
          ...(organizationId ? { organization_id: organizationId } : {}),
        })
        .select()
        .single()

      if (guestError || !guest) {
        const errMsg = `Falha ao criar hóspede para "${event.summary}" (${checkIn}-${checkOut}): ${guestError?.message || 'unknown'}`
        console.error('[Sync]', errMsg)
        errors.push(errMsg)
        skipped++
        continue
      }

      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          property_listing_id: listingId,
          guest_id: guest.id,
          check_in: checkIn,
          check_out: checkOut,
          status: 'confirmed',
          external_id: event.uid,
          booking_source: 'ical_import',
          source: source === 'booking' ? 'booking' : source === 'airbnb' ? 'airbnb' : 'ical_import',
          number_of_guests: bookingData.numGuests || 1,
          commission_calculated_at: new Date().toISOString(),
          ...(organizationId ? { organization_id: organizationId } : {}),
        })

      if (reservationError) {
        const errMsg = `Falha ao criar reserva para "${event.summary}" (${checkIn} → ${checkOut}): ${reservationError.message}`
        console.error('[Sync]', errMsg)
        errors.push(errMsg)
        skipped++
      } else {
        console.log(`[Sync] Reserva criada: "${event.summary}" (${checkIn} → ${checkOut})`)
        created++

        // Notificar proprietário (fire-and-forget)
        const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
        const { data: propData } = await supabase
          .from('property_listings')
          .select('properties!inner(name, owner_id)')
          .eq('id', listingId)
          .single()

        const prop = propData?.properties as unknown as PropertyInfo | null
        if (prop?.owner_id) {
          const { data: owner } = await supabase
            .from('owners')
            .select('full_name, email')
            .eq('id', prop.owner_id)
            .single()

          if (owner?.email) {
            enqueueEmail({
              type: 'owner_reservation',
              ownerName: owner.full_name,
              ownerEmail: owner.email,
              guestName: `${guestFirstName} ${guestLastName}`.trim(),
              propertyName: prop.name,
              checkIn,
              checkOut,
              nights,
              source: 'ical_import',
            }).catch(err => console.error('Erro ao enfileirar notificação de reserva:', err))
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
      .eq('property_listing_id', listingId)
      .in('booking_source', ['ical_import', 'ical_auto_sync'])
      .eq('status', 'confirmed')
      .not('external_id', 'is', null)

    if (existingReservations) {
      const today = new Date().toISOString().split('T')[0]
      for (const res of existingReservations) {
        // Skip past reservations — platforms remove them from iCal after checkout
        if (res.check_out < today) continue
        if (!receivedUids.has(res.external_id)) {
          const { error } = await supabase
            .from('reservations')
            .update({
              status: 'cancelled',
              cancellation_reason: 'Removida da plataforma (iCal)',
              cancelled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', res.id)

          if (!error) {
            cancelled++

            // Notificar proprietário sobre cancelamento (fire-and-forget)
            const { data: propData } = await supabase
              .from('property_listings')
              .select('properties!inner(name, owner_id)')
              .eq('id', listingId)
              .single()

            const prop = propData?.properties as unknown as { name: string; owner_id: string | null } | null
            if (prop?.owner_id) {
              const { data: owner } = await supabase
                .from('owners')
                .select('full_name, email')
                .eq('id', prop.owner_id)
                .single()

              if (owner?.email) {
                const guest = (res as unknown as CancelledReservationGuestRow).guests
                const cancelledGuestName = guest
                  ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
                  : 'Hóspede'
                const cancelledNights = Math.ceil(
                  (new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / (1000 * 60 * 60 * 24)
                )

                enqueueEmail({
                  type: 'owner_cancellation',
                  ownerName: owner.full_name,
                  ownerEmail: owner.email,
                  guestName: cancelledGuestName,
                  propertyName: prop.name,
                  checkIn: res.check_in,
                  checkOut: res.check_out,
                  nights: cancelledNights,
                  cancellationReason: 'Removida da plataforma (iCal)',
                  source: 'ical_import',
                }).catch(err => console.error('Erro ao enfileirar notificação de cancelamento:', err))
              }
            }
          }
        }
      }
    }
  }

  // Atualizar last_synced_at do listing
  await supabase
    .from('property_listings')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', listingId)

  return { created, updated, skipped, cancelled, errors }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    // Usar admin client para bypass de RLS nas operações de escrita
    const supabase = createAdminClient()

    // Modo novo: sync por propriedade(s)
    if (body.property_ids && Array.isArray(body.property_ids) && body.property_ids.length > 0) {
      // Buscar listings ativos com iCal URL das propriedades selecionadas
      const { data: listings, error: listingsError } = await supabase
        .from('property_listings')
        .select(`
          id,
          ical_url,
          property_id,
          properties!inner(
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
            created: 0, updated: 0, skipped: 0, cancelled: 0,
            errors: [] as string[],
          }
          for (const listing of propListings) {
            try {
              const propOrgId = (listing.properties as unknown as PropertyInfo)?.organization_id as string | undefined
              console.log(`[Sync] Listing ${listing.id}`)
              const r = await syncListing(supabase, listing.id, listing.ical_url, propOrgId)
              propResult.created   += r.created
              propResult.updated   += r.updated
              propResult.skipped   += r.skipped
              propResult.cancelled += r.cancelled
              propResult.errors.push(...r.errors)
            } catch (err: unknown) {
              const msg = `Listing ${listing.id}: ${err instanceof Error ? err.message : String(err)}`
              console.error(`[Sync] ${msg}`)
              propResult.errors.push(msg)
            }
          }
          return propResult
        })
      )

      type PropResult = { property_id: string; property_name: string; created: number; updated: number; skipped: number; cancelled: number; errors: string[] }
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
          skipped: acc.skipped + r.skipped,
          cancelled: acc.cancelled + r.cancelled,
        }),
        { created: 0, updated: 0, skipped: 0, cancelled: 0 }
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

    const adminSupabase = createAdminClient()

    // Buscar org_id via propriedade
    const { data: propData } = await adminSupabase
      .from('properties')
      .select('organization_id')
      .eq('id', property_id)
      .single()
    const legacyOrgId = propData?.organization_id as string | undefined

    const result = await syncListing(adminSupabase, listing_id, url, legacyOrgId)

    return NextResponse.json({
      success: true,
      ...result,
      total: result.created + result.updated + result.skipped,
    })
  } catch (error: unknown) {
    console.error('Erro na importação:', error)
    return NextResponse.json(
      { error: 'Erro ao importar calendário' },
      { status: 500 }
    )
  }
}
