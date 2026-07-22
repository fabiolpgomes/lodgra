import { createAdminClient } from '@/lib/supabase/admin'

/**
 * AC8: Rollout metrics monitoring
 * Track matching results (auto_matched, needs_review, no_match)
 * Monitor for zero duplications and correct property associations
 */

export interface MatchingMetrics {
  total_extractions: number
  auto_matched_count: number
  needs_review_count: number
  no_match_count: number
  auto_matched_rate: number // percentage
  needs_review_rate: number // percentage
  no_match_rate: number // percentage
  target_met: boolean // auto_matched >= 70%
}

export interface DuplicationCheck {
  has_duplicates: boolean
  duplicate_count: number
  details: string[]
}

export interface PropertyAssociationCheck {
  has_wrong_associations: boolean
  wrong_association_count: number
  details: string[]
}

/**
 * Get matching metrics for organization during pilot period
 * Tracks: auto_matched, needs_review, no_match rates
 */
export async function getMatchingMetrics(
  organizationId: string,
  sinceDate?: Date
): Promise<MatchingMetrics> {
  const supabase = createAdminClient()

  let query = supabase
    .from('email_extractions')
    .select('match_status')
    .eq('organization_id', organizationId)

  // Optional: filter by date range
  if (sinceDate) {
    query = query.gte('created_at', sinceDate.toISOString())
  }

  const { data: extractions, error } = await query

  if (error) {
    throw new Error(`Failed to fetch metrics: ${error.message}`)
  }

  const total = extractions?.length || 0
  const autoMatched = extractions?.filter((e) => e.match_status === 'auto_matched').length || 0
  const needsReview = extractions?.filter((e) => e.match_status === 'needs_review').length || 0
  const noMatch = extractions?.filter((e) => e.match_status === 'no_match').length || 0

  const autoMatchedRate = total > 0 ? (autoMatched / total) * 100 : 0
  const needsReviewRate = total > 0 ? (needsReview / total) * 100 : 0
  const noMatchRate = total > 0 ? (noMatch / total) * 100 : 0

  return {
    total_extractions: total,
    auto_matched_count: autoMatched,
    needs_review_count: needsReview,
    no_match_count: noMatch,
    auto_matched_rate: parseFloat(autoMatchedRate.toFixed(2)),
    needs_review_rate: parseFloat(needsReviewRate.toFixed(2)),
    no_match_rate: parseFloat(noMatchRate.toFixed(2)),
    target_met: autoMatchedRate >= 70,
  }
}

/**
 * Check for duplicate reservations (should be zero)
 * Duplicates = multiple extractions matched to same calendar event
 */
export async function checkForDuplicates(organizationId: string): Promise<DuplicationCheck> {
  const supabase = createAdminClient()

  // Find calendar_event_ids that appear more than once
  const { data: reservations, error } = await supabase
    .from('email_extractions')
    .select('matched_calendar_event_id, id')
    .eq('organization_id', organizationId)
    .not('matched_calendar_event_id', 'is', null)

  if (error) {
    throw new Error(`Failed to check duplicates: ${error.message}`)
  }

  const eventIdCounts = new Map<string, string[]>()
  reservations?.forEach((r) => {
    if (r.matched_calendar_event_id) {
      const ids = eventIdCounts.get(r.matched_calendar_event_id) || []
      ids.push(r.id)
      eventIdCounts.set(r.matched_calendar_event_id, ids)
    }
  })

  const duplicates = Array.from(eventIdCounts.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([eventId, ids]) => `Event ${eventId} matched by ${ids.length} extractions`)

  return {
    has_duplicates: duplicates.length > 0,
    duplicate_count: duplicates.length,
    details: duplicates,
  }
}

/**
 * Check for wrong property associations
 * Verifies matched_calendar_event belongs to correct property
 * (Basic check: extraction property_name vs calendar event property)
 */
export async function checkPropertyAssociations(
  organizationId: string
): Promise<PropertyAssociationCheck> {
  const supabase = createAdminClient()

  // Get all matched extractions with their calendar events
  const { data: matches, error } = await supabase
    .from('email_extractions as ee')
    .select(
      `
      id,
      property_name,
      matched_calendar_event_id,
      calendar_events!matched_calendar_event_id (
        property_identifier_raw
      )
    `
    )
    .eq('ee.organization_id', organizationId)
    .not('matched_calendar_event_id', 'is', null)

  if (error) {
    throw new Error(`Failed to check property associations: ${error.message}`)
  }

  const wrongAssociations: string[] = []

  matches?.forEach((match: any) => {
    if (match.calendar_events) {
      const extractionProp = (match.property_name || '').toLowerCase().trim()
      const calendarProp = (match.calendar_events.property_identifier_raw || '')
        .toLowerCase()
        .trim()

      // Simple check: properties should have some similarity
      if (
        extractionProp &&
        calendarProp &&
        !calendarProp.includes(extractionProp) &&
        !extractionProp.includes(calendarProp)
      ) {
        wrongAssociations.push(
          `Extraction "${match.property_name}" matched to event property "${match.calendar_events.property_identifier_raw}"`
        )
      }
    }
  })

  return {
    has_wrong_associations: wrongAssociations.length > 0,
    wrong_association_count: wrongAssociations.length,
    details: wrongAssociations,
  }
}

/**
 * Generate full rollout report
 */
export async function generateRolloutReport(
  organizationId: string,
  sinceDate?: Date
): Promise<{
  metrics: MatchingMetrics
  duplicates: DuplicationCheck
  property_associations: PropertyAssociationCheck
  all_checks_pass: boolean
}> {
  const metrics = await getMatchingMetrics(organizationId, sinceDate)
  const duplicates = await checkForDuplicates(organizationId)
  const propertyAssociations = await checkPropertyAssociations(organizationId)

  return {
    metrics,
    duplicates,
    property_associations,
    all_checks_pass:
      metrics.target_met && !duplicates.has_duplicates && !propertyAssociations.has_wrong_associations,
  }
}
