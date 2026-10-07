import { createAdminClient } from '@/lib/supabase/admin'
import { syncExtractedDataToReservation } from './sync-to-reservations'

/** Revisit email-first extractions without spending tokens on extraction again. */
export async function retryUnmatchedExtractions() {
  const db = createAdminClient()
  const { data, error } = await db.from('email_extractions').select('id, organization_id, source_platform, organizations!inner(email_ical_reconciliation_enabled, email_ical_pilot_platforms)')
    .eq('organizations.email_ical_reconciliation_enabled', true)
    .in('match_status', ['pending', 'no_match'])
    .gte('check_out', new Date().toISOString().slice(0, 10))
    .order('updated_at', { ascending: true }).limit(20)
  if (error) throw new Error('MATCH_RETRY_LOOKUP_FAILED')
  let errors = 0
  let matched = 0
  for (const row of data || []) {
    const result = await syncExtractedDataToReservation(row.id)
    if (!result.success) errors++
    else if (result.status === 'auto_matched') matched++
  }
  return { retried: data?.length || 0, matched, errors }
}
