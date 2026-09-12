import type { SupabaseClient } from '@supabase/supabase-js'
import type { ICalEvent, ICalEventClassification } from './icalService'

export interface CalendarEventAuditInput {
  supabase: SupabaseClient
  organizationId: string
  propertyId: string
  propertyListingId: string
  sourcePlatform: 'airbnb' | 'booking' | 'flatio' | 'vrbo' | 'unknown'
  event: Pick<ICalEvent, 'uid' | 'summary' | 'start' | 'end' | 'rawVEvent'>
  classification: ICalEventClassification
  reservationId?: string | null
}

export interface CalendarEventAuditResult {
  id: string
  status: 'unmatched' | 'matched' | 'ignored'
}

export async function upsertCalendarEventAudit(input: CalendarEventAuditInput): Promise<CalendarEventAuditResult> {
  const {
    supabase,
    organizationId,
    propertyId,
    propertyListingId,
    sourcePlatform,
    event,
    classification,
    reservationId = null,
  } = input

  const { data, error } = await supabase.rpc('upsert_calendar_event_audit', {
    p_organization_id: organizationId,
    p_property_id: propertyId,
    p_property_listing_id: propertyListingId,
    p_source_platform: sourcePlatform,
    p_check_in: event.start.toISOString().split('T')[0],
    p_check_out: event.end.toISOString().split('T')[0],
    p_ical_uid: event.uid,
    p_raw_summary: event.summary || null,
    p_raw_vevent: event.rawVEvent || '',
    p_event_kind: classification,
    p_reservation_id: reservationId,
  })

  if (error) {
    throw new Error(`Falha ao registrar evento iCal bruto: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Falha ao registrar evento iCal bruto: resposta vazia')
  return row as CalendarEventAuditResult
}
