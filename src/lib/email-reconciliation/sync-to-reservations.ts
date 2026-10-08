import { isPlatformInPilot } from './feature-flag'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasRequiredReservationFieldsOnRow, type EmailExtraction } from './extraction.schema'
import { decideMatch, matchEmailToCalendarEvents, type CalendarEvent } from './matching-engine'
import { chooseBookingAnchor, isBookingPartialConfirmation, PLACEHOLDER_GUEST_NAME } from './booking-partial'

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
  if (!(await isPlatformInPilot(extraction.organization_id, extraction.source_platform))) return { success: false, error: 'RECONCILIATION_DISABLED' }

  if (extraction.match_status === 'auto_matched' && extraction.matched_event_id) {
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('organization_id', extraction.organization_id)
      .eq('calendar_event_id', extraction.matched_event_id)
      .maybeSingle()
    if (error) return { success: false, error: error.message }
    return reservation ? { success: true, status: 'auto_matched', reservationId: reservation.id } : { success: false, error: 'MATCHED_RESERVATION_MISSING' }
  }

  if (isBookingPartialConfirmation(extraction)) return reconcileBookingPartial(supabase, extraction)

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

  // Cross-provider replay: use a commercial identity before looking for an
  // unmatched event. The atomic writer verifies tenant/listing/dates/lifecycle.
  if (extraction.reservation_code) {
    const { data: existing, error } = await supabase.from('reservations')
      .select('calendar_event_id').eq('organization_id', extraction.organization_id)
      .eq('source', extraction.source_platform).eq('booking_reference', extraction.reservation_code)
      .maybeSingle()
    if (error) return { success: false, error: error.message }
    if (existing?.calendar_event_id) {
      const { data, error: reconcileError } = await supabase.rpc('reconcile_email_extraction', {
        p_extraction_id: extraction.id, p_event_id: existing.calendar_event_id, p_confirmed_by_host: false,
      })
      if (reconcileError) {
        const { error: reviewError } = await supabase.from('email_extractions')
          .update({ match_status: 'needs_review', updated_at: new Date().toISOString() })
          .eq('id', extraction.id).eq('organization_id', extraction.organization_id)
        return reviewError ? { success: false, error: reviewError.message } : { success: true, status: 'needs_review' }
      }
      return { success: true, status: 'auto_matched', reservationId: (data as { reservation_id: string }).reservation_id }
    }
  }

  const oneDayBefore = new Date(`${extraction.check_in}T00:00:00.000Z`)
  oneDayBefore.setUTCDate(oneDayBefore.getUTCDate() - 1)
  const oneDayAfter = new Date(`${extraction.check_out}T00:00:00.000Z`)
  oneDayAfter.setUTCDate(oneDayAfter.getUTCDate() + 1)

  const { data: rows, error: eventsError } = await supabase
    .from('calendar_events')
    .select('id, property_id, organization_id, source_platform, check_in, check_out, raw_summary, status, created_at, properties:properties!calendar_events_property_org_fk(name)')
    .eq('organization_id', extraction.organization_id)
    .eq('status', 'unmatched')
    .eq('source_platform', extraction.source_platform)
    .gte('check_in', oneDayBefore.toISOString().slice(0, 10))
    .lte('check_out', oneDayAfter.toISOString().slice(0, 10))
    .order('created_at', { ascending: true })
    .limit(101)

  if (eventsError) return { success: false, error: eventsError.message }

  if ((rows?.length || 0) > 100) {
    const { error } = await supabase.from('email_extractions').update({ match_status: 'needs_review', updated_at: new Date().toISOString() }).eq('id', extraction.id).eq('organization_id', extraction.organization_id)
    return error ? { success: false, error: error.message } : { success: true, status: 'needs_review' }
  }

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
  const selected = (rows || []).find(row => row.id === eventId)
  if (extraction.total_value !== null && extraction.currency && selected?.property_id) {
    const { data: history, error: historyError } = await supabase.from('reservations')
      .select('total_amount, check_in, check_out').eq('organization_id', extraction.organization_id)
      .eq('property_id', selected.property_id).eq('currency', extraction.currency)
      .eq('reservation_status', 'confirmed').is('deleted_at', null)
      .gt('total_amount', 0).order('check_in', { ascending: false }).limit(20)
    if (historyError) return { success: false, error: 'FINANCIAL_HISTORY_UNAVAILABLE' }
    const rates = (history || []).flatMap(row => {
      const nights = (Date.parse(row.check_out) - Date.parse(row.check_in)) / 86_400_000
      return nights > 0 && row.total_amount > 0 ? [row.total_amount / nights] : []
    })
    if (rates.length >= 3) {
      rates.sort((a, b) => a - b)
      const median = rates[Math.floor(rates.length / 2)]
      const nights = (Date.parse(extraction.check_out) - Date.parse(extraction.check_in)) / 86_400_000
      const expected = median * nights
      if (extraction.total_value > expected * 3 || extraction.total_value < expected / 3) {
        const { error } = await supabase.from('email_extractions').update({ match_status: 'needs_review', updated_at: new Date().toISOString() })
          .eq('id', extraction.id).eq('organization_id', extraction.organization_id)
        return error ? { success: false, error: error.message } : { success: true, status: 'needs_review' }
      }
    }
  }
  const { data, error } = await supabase.rpc('reconcile_email_extraction', {
    p_extraction_id: extraction.id,
    p_event_id: eventId,
    p_confirmed_by_host: false,
  })
  if (error?.code === 'PT409' && error.message === 'FINANCIAL_TOTAL_MANAGED_BY_SNAPSHOT') {
    // A declared financial snapshot needs a host decision, not another automatic write.
    const { error: reviewError } = await supabase
      .from('email_extractions')
      .update({ match_status: 'needs_review', updated_at: new Date().toISOString() })
      .eq('id', extraction.id)
      .eq('organization_id', extraction.organization_id)
    return reviewError
      ? { success: false, error: reviewError.message }
      : { success: true, status: 'needs_review' }
  }
  if (error) return { success: false, error: error.message }

  const result = data as { reservation_id?: string } | null
  return {
    success: true,
    status: 'auto_matched',
    reservationId: result?.reservation_id,
  }
}

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

async function setMatchStatus(supabase: AdminClient, extraction: ReconciliationExtractionRow, status: 'needs_review' | 'no_match'): Promise<SyncResult> {
  const { error } = await supabase.from('email_extractions')
    .update({ match_status: status, updated_at: new Date().toISOString() })
    .eq('id', extraction.id).eq('organization_id', extraction.organization_id)
  return error ? { success: false, error: error.message } : { success: true, status }
}

/**
 * Booking "Nova reserva!" e-mails carry only code + check-in + listing name. The stay is anchored on the
 * single opaque Booking block that starts that day for that listing; the block supplies the check-out and
 * the guest stays as the standard placeholder until the host completes it from the extranet.
 */
async function reconcileBookingPartial(supabase: AdminClient, extraction: ReconciliationExtractionRow): Promise<SyncResult> {
  const { data: rows, error } = await supabase
    .from('calendar_events')
    .select('id, check_in, check_out, raw_summary, properties:properties!calendar_events_property_org_fk(name)')
    .eq('organization_id', extraction.organization_id)
    .eq('status', 'unmatched')
    .eq('source_platform', 'booking')
    .eq('check_in', extraction.check_in)
    .limit(20)
  if (error) return { success: false, error: error.message }

  const decision = chooseBookingAnchor(extraction.property_identifier_raw, (rows || []).map(row => ({
    id: row.id, check_in: row.check_in, check_out: row.check_out, raw_summary: row.raw_summary,
    property_name: propertyName(row.properties as PropertyRelation),
  })))
  if (decision.status !== 'matched') return setMatchStatus(supabase, extraction, decision.status)

  const { error: completeError } = await supabase.from('email_extractions')
    .update({
      check_out: decision.event.check_out,
      guest_name: extraction.guest_name?.trim() || PLACEHOLDER_GUEST_NAME,
      match_status: 'pending', updated_at: new Date().toISOString(),
    })
    .eq('id', extraction.id).eq('organization_id', extraction.organization_id)
  if (completeError) return { success: false, error: completeError.message }

  const { data, error: reconcileError } = await supabase.rpc('reconcile_email_extraction', {
    p_extraction_id: extraction.id, p_event_id: decision.event.id, p_confirmed_by_host: false,
  })
  if (reconcileError) return setMatchStatus(supabase, extraction, 'needs_review')
  return { success: true, status: 'auto_matched', reservationId: (data as { reservation_id?: string } | null)?.reservation_id }
}
