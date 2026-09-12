import { createAdminClient } from '@/lib/supabase/admin'
import { hasRequiredReservationFieldsOnRow, type EmailExtraction } from './extraction.schema'
import { decideMatch, matchEmailToCalendarEvents, type CalendarEvent } from './matching-engine'

type SyncResult = {
  success: boolean
  status?: 'auto_matched' | 'needs_review' | 'no_match'
  reservationId?: string
  error?: string
}

type PropertyRelation = { name: string } | Array<{ name: string }> | null
type ReconciliationExtractionRow = EmailExtraction & {
  id: string
  organization_id: string
  raw_email_id: string
  match_status: 'pending' | 'auto_matched' | 'needs_review' | 'no_match'
  matched_event_id: string | null
}

function propertyName(relation: PropertyRelation): string | null {
  const property = Array.isArray(relation) ? relation[0] : relation
  return property?.name || null
}

export async function syncExtractedDataToReservation(extractionId: string): Promise<SyncResult> {
  const supabase = await createAdminClient()
  const { data: extractionData, error: extractionError } = await supabase
    .from('email_extractions')
    .select('*')
    .eq('id', extractionId)
    .single()

  if (extractionError || !extractionData) {
    return { success: false, error: extractionError?.message || 'Extraction not found' }
  }
  const extraction = extractionData as unknown as ReconciliationExtractionRow

  if (extraction.match_status === 'auto_matched' && extraction.matched_event_id) {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('organization_id', extraction.organization_id)
      .eq('email_extraction_id', extraction.id)
      .maybeSingle()
    if (error) return { success: false, error: error.message }
    return { success: true, status: 'auto_matched', reservationId: reservation?.id }
  }

  if (!hasRequiredReservationFieldsOnRow(extraction)) {
    const { error } = await supabase
      .from('email_extractions')
      .update({ match_status: 'needs_review', updated_at: new Date().toISOString() })
      .eq('id', extraction.id)
      .eq('organization_id', extraction.organization_id)
    return error
      ? { success: false, error: error.message }
      : { success: true, status: 'needs_review' }
  }

  const oneDayBefore = new Date(`${extraction.check_in}T00:00:00.000Z`)
  oneDayBefore.setUTCDate(oneDayBefore.getUTCDate() - 1)
  const oneDayAfter = new Date(`${extraction.check_out}T00:00:00.000Z`)
  oneDayAfter.setUTCDate(oneDayAfter.getUTCDate() + 1)

  const { data: rows, error: eventsError } = await supabase
    .from('calendar_events')
    .select('id, organization_id, source_platform, check_in, check_out, raw_summary, status, created_at, properties:properties!calendar_events_property_org_fk(name)')
    .eq('organization_id', extraction.organization_id)
    .eq('status', 'unmatched')
    .gte('check_in', oneDayBefore.toISOString().slice(0, 10))
    .lte('check_out', oneDayAfter.toISOString().slice(0, 10))
    .order('created_at', { ascending: true })
    .limit(100)

  if (eventsError) return { success: false, error: eventsError.message }

  const events: CalendarEvent[] = (rows || []).map((row) => ({
    id: row.id,
    organization_id: row.organization_id,
    source_platform: row.source_platform,
    check_in: row.check_in,
    check_out: row.check_out,
    raw_summary: row.raw_summary,
    property_identifier_raw: propertyName(row.properties as PropertyRelation),
    status: row.status,
    created_at: row.created_at,
  }))

  const decision = decideMatch(matchEmailToCalendarEvents(extraction, events))
  if (decision.status !== 'auto_matched') {
    const { error } = await supabase
      .from('email_extractions')
      .update({ match_status: decision.status, updated_at: new Date().toISOString() })
      .eq('id', extraction.id)
      .eq('organization_id', extraction.organization_id)
    return error
      ? { success: false, error: error.message }
      : { success: true, status: decision.status }
  }

  const eventId = decision.candidates[0].target_id
  const { data, error } = await supabase.rpc('reconcile_email_extraction', {
    p_extraction_id: extraction.id,
    p_event_id: eventId,
    p_confirmed_by_host: false,
  })
  if (error) return { success: false, error: error.message }

  const result = data as { reservation_id?: string } | null
  return {
    success: true,
    status: 'auto_matched',
    reservationId: result?.reservation_id,
  }
}
