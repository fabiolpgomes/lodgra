import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { createAdminClient } from '@/lib/supabase/admin'

type PropertyRow = {
  id: string
  name: string
  city: string | null
  currency: string | null
}

type ChannelConnection = { channel?: string | null } | Array<{ channel?: string | null }> | null

const REPORT_PAGE_SIZE = 1000

export async function fetchAllReportPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = REPORT_PAGE_SIZE
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError('pageSize must be a positive integer')
  }

  const rows: T[] = []
  while (true) {
    const page = await fetchPage(rows.length, rows.length + pageSize - 1)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export function escapeReportHtml(value: string): string {
  return value
    .replace(/&(?!(?:amp|lt|gt|quot|#39);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function truncateReportText(value: string, maxLength: number): string {
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) {
    throw new RangeError('maxLength must be a positive integer')
  }
  if (value.length <= maxLength) return value
  if (maxLength === 1) return '…'
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

export function reservationOverlapsReport(
  checkIn: string,
  checkOut: string,
  startDate: string,
  endDate: string
): boolean {
  return checkIn <= endDate && checkOut > startDate
}

export type ReservationReportRow = {
  id: string
  property_id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number | null
  currency: string
  number_of_guests: number
  adults: number | null
  children: number | null
  notes: string | null
  internal_notes: string | null
  source: string | null
  property_listings: {
    properties: PropertyRow
    platforms: { display_name: string } | null
  }
  guests: {
    first_name: string
    last_name: string
    email: string | null
  } | null
}

function channelFromConnection(connection: ChannelConnection): string | null {
  const value = Array.isArray(connection) ? connection[0] : connection
  return value?.channel || null
}

export function mapCanonicalReservationToReport(
  reservation: {
    id: string
    property_id: string
    check_in: string
    check_out: string
    reservation_status: string | null
    total_price: number | null
    currency: string | null
    number_of_guests: number | null
    adults: number | null
    children: number | null
    notes: string | null
    guest_name: string | null
    guest_email: string | null
    channel_connections: ChannelConnection
  },
  property: PropertyRow
): ReservationReportRow {
  const channel = channelFromConnection(reservation.channel_connections)
  return {
    id: reservation.id,
    property_id: reservation.property_id,
    check_in: reservation.check_in,
    check_out: reservation.check_out,
    status: reservation.reservation_status || '',
    total_amount: reservation.total_price,
    currency: reservation.currency || property.currency || 'EUR',
    number_of_guests: reservation.number_of_guests || 0,
    adults: reservation.adults,
    children: reservation.children,
    notes: reservation.notes,
    internal_notes: reservation.notes,
    source: channel,
    property_listings: {
      properties: property,
      platforms: channel ? { display_name: channel } : null,
    },
    guests: reservation.guest_name
      ? { first_name: reservation.guest_name, last_name: '', email: reservation.guest_email }
      : null,
  }
}

export async function loadReservationReportData({
  sessionClient,
  organizationId,
  startDate,
  endDate,
  propertyId,
}: {
  sessionClient: SupabaseClient
  organizationId: string
  startDate: string
  endDate: string
  propertyId?: string
}): Promise<ReservationReportRow[]> {
  const adminClient = createAdminClient()
  const userPropertyIds = await getUserPropertyIds(sessionClient)

  const { data: organizationProperties, error: propertiesError } = await adminClient
    .from('properties')
    .select('id, name, city, currency')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (propertiesError) throw propertiesError

  const assignedIds = userPropertyIds ? new Set(userPropertyIds) : null
  const allowedProperties = (organizationProperties || []).filter(property =>
    (!assignedIds || assignedIds.has(property.id)) && (!propertyId || property.id === propertyId)
  ) as PropertyRow[]

  if (propertyId && !allowedProperties.some(property => property.id === propertyId)) {
    throw new Error('PROPERTY_ACCESS_DENIED')
  }
  if (allowedProperties.length === 0) return []

  const propertiesById = new Map(allowedProperties.map(property => [property.id, property]))
  const reservations = await fetchAllReportPages(async (from, to) => {
    const { data, error } = await adminClient
      .from('reservations')
      .select(`
        id,
        property_id,
        check_in,
        check_out,
        reservation_status,
        total_price,
        currency,
        number_of_guests,
        adults,
        children,
        notes,
        guest_name,
        guest_email,
        channel_connections(channel)
      `)
      .in('property_id', allowedProperties.map(property => property.id))
      .eq('reservation_status', 'confirmed')
      .lte('check_in', endDate)
      .gt('check_out', startDate)
      .order('check_in', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) throw error
    return data || []
  })

  return reservations.flatMap(reservation => {
    const property = propertiesById.get(reservation.property_id)
    return property ? [mapCanonicalReservationToReport(reservation, property)] : []
  })
}
