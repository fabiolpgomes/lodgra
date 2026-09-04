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

function statusForClassification(classification: ICalEventClassification): 'unmatched' | 'matched' | 'ignored' {
  if (classification === 'reservation') return 'matched'
  if (classification === 'block') return 'ignored'
  return 'unmatched'
}

export async function upsertCalendarEventAudit(input: CalendarEventAuditInput): Promise<void> {
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

  const payload = {
    organization_id: organizationId,
    property_id: propertyId,
    property_listing_id: propertyListingId,
    source_platform: sourcePlatform,
    check_in: event.start.toISOString().split('T')[0],
    check_out: event.end.toISOString().split('T')[0],
    ical_uid: event.uid,
    raw_summary: event.summary || null,
    raw_vevent: event.rawVEvent || '',
    event_kind: classification,
    reservation_id: reservationId,
    status: statusForClassification(classification),
  }

  const { error } = await supabase
    .from('calendar_events')
    .upsert(payload, {
      onConflict: 'organization_id,property_id,property_listing_id,ical_uid',
    })

  if (error) {
    throw new Error(`Falha ao registrar evento iCal bruto: ${error.message}`)
  }
}
