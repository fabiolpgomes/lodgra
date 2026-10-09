import { createAdminClient } from '@/lib/supabase/admin'
import { addDaysToDateOnly } from '@/lib/dates/date-only'
import { syncExtractedDataToReservation } from './sync-to-reservations'

/**
 * Revisit email-first extractions without spending tokens on extraction again.
 * email_extractions has no direct FK to organizations, so enabled orgs are resolved first
 * (a PostgREST embed would fail and block the whole queue).
 */
export async function retryUnmatchedExtractions() {
  const db = createAdminClient()
  const { data: orgs, error: orgError } = await db.from('organizations').select('id')
    .eq('email_ical_reconciliation_enabled', true)
  if (orgError) throw new Error('MATCH_RETRY_LOOKUP_FAILED')
  const orgIds = (orgs || []).map(org => org.id as string)
  if (!orgIds.length) return { retried: 0, matched: 0, errors: 0 }

  // Todas as organizações numa só query: o corte usa o dia UTC menos 1 (superset de "hoje" em qualquer fuso),
  // para nunca excluir uma extração cujo check-out é hoje no fuso da organização.
  const utcToday = new Date().toISOString().slice(0, 10)
  const today = addDaysToDateOnly(utcToday, -1)
  const recentCheckIn = addDaysToDateOnly(utcToday, -30)
  const { data, error } = await db.from('email_extractions').select('id')
    .in('organization_id', orgIds)
    .in('match_status', ['pending', 'no_match'])
    // Booking partial confirmations have no check-out until the iCal block arrives.
    .or(`check_out.gte.${today},and(check_out.is.null,source_platform.eq.booking,check_in.gte.${recentCheckIn})`)
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
