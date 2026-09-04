import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

type CalendarEventRow = {
  id: string
  organization_id: string
  property_id: string
  property_listing_id: string
  source_platform: string
  check_in: string
  check_out: string
  ical_uid: string
  raw_summary: string | null
  raw_vevent: string
  event_kind: string
  status: string
  reservation_id: string | null
  created_at: string
  updated_at: string
}

type CalendarEventAuditRow = CalendarEventRow & {
  property_name?: string | null
  platform_name?: string | null
  classification_label: string
  classification_reason: string
  operational_hint: string
  incoming_summary: string
  action_recommendation: string
  action_marker: string
  action_marker_reason: string
}

function buildOperationalContext(event: CalendarEventRow) {
  const reservationRef = event.reservation_id ? `reservation_id ${event.reservation_id}` : 'sem reservation_id local'
  const summary = event.raw_summary?.trim() || 'sem summary'
  const sourceSnapshot = `UID ${event.ical_uid} · ${event.check_in} → ${event.check_out} · ${summary}`
  const cancelled = event.status.toLowerCase().includes('cancel')

  if (cancelled) {
    return {
      classification_label: 'Reserva',
      classification_reason: event.reservation_id
        ? `Evento cancelado com ${reservationRef}.`
        : 'Evento cancelado identificado pelo feed iCal.',
      operational_hint: 'Sinal operacional: tratar como cancelamento.',
      incoming_summary: event.reservation_id
        ? `${sourceSnapshot} · ${reservationRef}`
        : sourceSnapshot,
      action_recommendation: 'Ação esperada: cancelar a reserva correspondente no Lodgra.',
      action_marker: 'cancelamento',
      action_marker_reason: 'O status do evento indica cancelamento.',
    }
  }

  if (event.event_kind === 'reservation') {
    return {
      classification_label: 'Reserva',
      classification_reason: event.reservation_id
        ? `Reserva identificada com ${reservationRef}.`
        : 'Classificado como reserva pelo feed iCal, mas ainda sem reservation_id local.',
      operational_hint: 'Sinal operacional: tratar como inclusão ou alteração de reserva.',
      incoming_summary: event.reservation_id
        ? `${sourceSnapshot} · ${reservationRef}`
        : sourceSnapshot,
      action_recommendation: event.reservation_id
        ? 'Ação esperada: atualizar a reserva existente no Lodgra.'
        : 'Ação esperada: criar a reserva no Lodgra.',
      action_marker: event.reservation_id ? 'alteração' : 'inclusão',
      action_marker_reason: event.reservation_id
        ? 'Há reservation_id local, então o evento se comporta como atualização.'
        : 'Não há reservation_id local, então o evento se comporta como inclusão.',
    }
  }

  if (event.event_kind === 'block') {
    return {
      classification_label: 'Bloqueio',
      classification_reason: event.reservation_id
        ? `Bloqueio com referência local ${reservationRef}.`
        : 'Sem reservation_id, o evento aparenta ser um bloqueio de calendário.',
      operational_hint: 'Sinal operacional: tratar como bloqueio ou ocupação e não como reserva.',
      incoming_summary: event.reservation_id
        ? `${sourceSnapshot} · ${reservationRef}`
        : sourceSnapshot,
      action_recommendation: 'Ação esperada: criar ou atualizar o bloqueio no calendário da propriedade.',
      action_marker: 'bloqueio',
      action_marker_reason: 'O evento foi classificado como bloqueio de calendário.',
    }
  }

  return {
    classification_label: 'Indefinido',
    classification_reason: event.raw_summary?.toLowerCase().includes('closed')
      ? 'Encontramos uma pista heurística ("CLOSED"), mas ela não foi suficiente para classificar com segurança.'
      : 'Não há sinal explícito suficiente para diferenciar reserva de bloqueio.',
    operational_hint: 'Sinal operacional: revisar o VEVENT bruto antes de decidir incluir, alterar ou cancelar.',
    incoming_summary: sourceSnapshot,
    action_recommendation: 'Ação esperada: não aplicar inclusão/alteração/cancelamento automaticamente sem revisão do VEVENT bruto.',
    action_marker: 'revisão',
    action_marker_reason: 'O evento não teve classificação suficiente para decisão automática.',
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  try {
    const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20
    const rawQuery = request.nextUrl.searchParams.get('q') || ''
    const query = rawQuery.trim().toLowerCase()

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = await createAdminClient()

    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select(`
        id,
        property_id,
        organization_id,
        properties:properties!property_listings_property_org_fk(name),
        platforms(display_name, name)
      `)
      .eq('organization_id', auth.organizationId)

    if (listingsError) {
      return NextResponse.json({ error: true, message: listingsError.message, data: [] }, { status: 200 })
    }

    const listingIds = (listings || []).map((listing: any) => listing.id)
    if (listingIds.length === 0) {
      return NextResponse.json({ error: false, data: [], summary: { reservations: 0, blocks: 0, unknown: 0 } })
    }

    const { data: events, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        organization_id,
        property_id,
        property_listing_id,
        source_platform,
        check_in,
        check_out,
        ical_uid,
        raw_summary,
        raw_vevent,
        event_kind,
        status,
        reservation_id,
        created_at,
        updated_at
      `)
      .eq('organization_id', auth.organizationId)
      .in('property_listing_id', listingIds)
      .order('created_at', { ascending: false })
      .limit(query ? Math.max(limit, 100) : limit)

    if (error) {
      return NextResponse.json({ error: true, message: error.message, data: [] }, { status: 200 })
    }

    const listingMap = new Map<string, { propertyName: string | null; platformName: string | null }>()
    ;(listings || []).forEach((listing: any) => {
      const property = Array.isArray(listing.properties) ? listing.properties[0] : listing.properties
      const platform = Array.isArray(listing.platforms) ? listing.platforms[0] : listing.platforms
      listingMap.set(listing.id, {
        propertyName: property?.name || null,
        platformName: platform?.display_name || platform?.name || null,
      })
    })

    const data = ((events || []) as CalendarEventRow[])
      .map((event) => {
      const listing = listingMap.get(event.property_listing_id)
      const operationalContext = buildOperationalContext(event)
      return {
        ...event,
        property_name: listing?.propertyName || null,
        platform_name: listing?.platformName || null,
        ...operationalContext,
      }
      })
      .filter((event: CalendarEventAuditRow) => {
        if (!query) return true

        const haystack = [
          event.ical_uid,
          event.raw_summary,
          event.raw_vevent,
          event.property_name,
          event.platform_name,
          event.source_platform,
          event.event_kind,
          event.status,
          event.classification_label,
          event.classification_reason,
          event.operational_hint,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
      .slice(0, limit)

    return NextResponse.json({
      error: false,
      data,
      summary: {
        reservations: data.filter(event => event.event_kind === 'reservation').length,
        blocks: data.filter(event => event.event_kind === 'block').length,
        unknown: data.filter(event => event.event_kind === 'unknown').length,
      },
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: true, message: errorMsg, data: [] }, { status: 200 })
  }
}
