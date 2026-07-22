import { EmailExtraction } from './extraction.schema'

export type EmailExtractionData = EmailExtraction

export interface CalendarEvent {
  id: string
  organization_id: string
  source_platform: 'airbnb' | 'booking' | 'vrbo' | 'google'
  check_in: Date
  check_out: Date
  raw_summary: string // iCal summary/description
  property_identifier_raw: string // iCal location or custom field
  status: 'unmatched' | 'matched'
  created_at: Date
}

export interface MatchCandidate {
  target_id: string
  target_type: 'calendar_event' | 'email_extraction'
  score: number
  details: {
    reservation_code_match?: boolean
    dates_exact?: boolean
    dates_within_tolerance?: number // days
    source_platform_match?: boolean
    property_similarity?: number // 0-1
  }
}

export interface MatchDecision {
  status: 'auto_matched' | 'needs_review' | 'no_match'
  candidates: MatchCandidate[]
  confidence: number
  reason: string
}

/**
 * AC5: Pure matching function — email → calendar events
 * Returns ordered candidates by score
 */
export function matchEmailToCalendarEvents(
  emailExtraction: EmailExtractionData & { id: string; organization_id: string; source_platform: string },
  calendarEvents: CalendarEvent[]
): MatchCandidate[] {
  // Filter candidates
  const candidates = calendarEvents.filter(
    (event) =>
      event.organization_id === emailExtraction.organization_id && event.status === 'unmatched'
  )

  // Score each candidate
  const scored = candidates.map((event) => {
    let score = 0
    const details: MatchCandidate['details'] = {}

    // Rule 1: reservation_code match in raw_summary (50 points)
    if (emailExtraction.reservation_code) {
      if (
        event.raw_summary
          .toLowerCase()
          .includes(emailExtraction.reservation_code.toLowerCase())
      ) {
        score += 50
        details.reservation_code_match = true
      }
    }

    // Rule 2: exact date match (30 points)
    const eventCheckIn = new Date(event.check_in)
    const eventCheckOut = new Date(event.check_out)
    const emailCheckIn = new Date(emailExtraction.check_in)
    const emailCheckOut = new Date(emailExtraction.check_out)

    if (
      eventCheckIn.toISOString().split('T')[0] === emailCheckIn.toISOString().split('T')[0] &&
      eventCheckOut.toISOString().split('T')[0] === emailCheckOut.toISOString().split('T')[0]
    ) {
      score += 30
      details.dates_exact = true
    } else {
      // Rule 3: dates within ±1 day (15 points, replaces exact match)
      const checkInDiff = Math.abs(
        (eventCheckIn.getTime() - emailCheckIn.getTime()) / (1000 * 60 * 60 * 24)
      )
      const checkOutDiff = Math.abs(
        (eventCheckOut.getTime() - emailCheckOut.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (checkInDiff <= 1 && checkOutDiff <= 1) {
        score += 15
        details.dates_within_tolerance = Math.max(checkInDiff, checkOutDiff)
      }
    }

    // Rule 4: source platform match (10 points)
    if (
      event.source_platform.toLowerCase() ===
      (emailExtraction.source_platform || 'unknown').toLowerCase()
    ) {
      score += 10
      details.source_platform_match = true
    }

    // Rule 5: property fuzzy match (10 points, ≥0.6 similarity)
    const propertySimilarity = calculateFuzzySimilarity(
      emailExtraction.property_name || '',
      event.property_identifier_raw || ''
    )
    if (propertySimilarity >= 0.6) {
      score += 10
      details.property_similarity = propertySimilarity
    }

    return {
      target_id: event.id,
      target_type: 'calendar_event' as const,
      score,
      details,
    }
  })

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * AC5: Pure matching function — calendar event → emails
 * Mirror of matchEmailToCalendarEvents
 */
export function matchCalendarEventToEmails(
  calendarEvent: CalendarEvent & { id: string },
  emailExtractions: (EmailExtractionData & { id: string; organization_id: string; source_platform: string; match_status?: string })[]
): MatchCandidate[] {
  // Filter candidates
  const candidates = emailExtractions.filter(
    (email) =>
      email.organization_id === calendarEvent.organization_id &&
      (email.match_status === 'pending' || !email.match_status)
  )

  // Score each candidate
  const scored = candidates.map((email) => {
    let score = 0
    const details: MatchCandidate['details'] = {}

    // Rule 1: reservation_code match (50 points)
    if (email.reservation_code) {
      if (
        calendarEvent.raw_summary
          .toLowerCase()
          .includes(email.reservation_code.toLowerCase())
      ) {
        score += 50
        details.reservation_code_match = true
      }
    }

    // Rule 2: exact date match (30 points)
    const eventCheckIn = new Date(calendarEvent.check_in)
    const eventCheckOut = new Date(calendarEvent.check_out)
    const emailCheckIn = new Date(email.check_in)
    const emailCheckOut = new Date(email.check_out)

    if (
      eventCheckIn.toISOString().split('T')[0] === emailCheckIn.toISOString().split('T')[0] &&
      eventCheckOut.toISOString().split('T')[0] === emailCheckOut.toISOString().split('T')[0]
    ) {
      score += 30
      details.dates_exact = true
    } else {
      // Rule 3: dates within ±1 day (15 points)
      const checkInDiff = Math.abs(
        (eventCheckIn.getTime() - emailCheckIn.getTime()) / (1000 * 60 * 60 * 24)
      )
      const checkOutDiff = Math.abs(
        (eventCheckOut.getTime() - emailCheckOut.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (checkInDiff <= 1 && checkOutDiff <= 1) {
        score += 15
        details.dates_within_tolerance = Math.max(checkInDiff, checkOutDiff)
      }
    }

    // Rule 4: source platform match (10 points)
    if (
      calendarEvent.source_platform.toLowerCase() ===
      (email.source_platform || 'unknown').toLowerCase()
    ) {
      score += 10
      details.source_platform_match = true
    }

    // Rule 5: property fuzzy match (10 points)
    const propertySimilarity = calculateFuzzySimilarity(
      email.property_name || '',
      calendarEvent.property_identifier_raw || ''
    )
    if (propertySimilarity >= 0.6) {
      score += 10
      details.property_similarity = propertySimilarity
    }

    return {
      target_id: email.id,
      target_type: 'email_extraction' as const,
      score,
      details,
    }
  })

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * AC5: Decision logic — separate from scoring
 * Score ≥80: auto_matched
 * Score 40-79: needs_review
 * Score <40: no_match
 */
export function decideMatch(candidates: MatchCandidate[]): MatchDecision {
  if (candidates.length === 0) {
    return {
      status: 'no_match',
      candidates: [],
      confidence: 0,
      reason: 'No candidates found',
    }
  }

  const topScore = candidates[0].score

  // Check for real ambiguity (tied scores at top) — NEVER auto-match if ambiguous
  const topCandidates = candidates.filter((c) => c.score === topScore)
  if (topCandidates.length > 1) {
    return {
      status: 'needs_review',
      candidates: candidates.slice(0, 3),
      confidence: topScore / 100,
      reason: `Ambiguity: ${topCandidates.length} candidates tied at score ${topScore}`,
    }
  }

  if (topScore >= 80) {
    return {
      status: 'auto_matched',
      candidates: [candidates[0]],
      confidence: topScore / 100,
      reason: `Auto-match: score ${topScore}`,
    }
  }

  if (topScore >= 40) {
    return {
      status: 'needs_review',
      candidates: candidates.slice(0, 3),
      confidence: topScore / 100,
      reason: `Needs review: top score ${topScore} < 80`,
    }
  }

  return {
    status: 'no_match',
    candidates: [],
    confidence: topScore / 100,
    reason: `No match: top score ${topScore} < 40`,
  }
}

/**
 * Utility: Fuzzy string similarity (0-1)
 * Simple implementation: Levenshtein distance normalized
 */
function calculateFuzzySimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1

  // Substring check (partial match)
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.max(s1.length, s2.length) / Math.min(s1.length, s2.length) * 0.8
  }

  // Levenshtein distance (simplified)
  const len1 = s1.length
  const len2 = s2.length
  const maxLen = Math.max(len1, len2)

  let distance = 0
  for (let i = 0; i < Math.min(len1, len2); i++) {
    if (s1[i] !== s2[i]) distance++
  }
  distance += Math.abs(len1 - len2)

  return Math.max(0, 1 - distance / (maxLen * 2))
}
