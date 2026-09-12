import { EmailExtraction } from './extraction.schema'

export type EmailExtractionData = EmailExtraction

export interface CalendarEvent {
  id: string
  organization_id: string
  source_platform: 'airbnb' | 'booking' | 'vrbo'
  check_in: Date | string
  check_out: Date | string
  raw_summary: string | null
  property_identifier_raw: string | null
  status: 'unmatched' | 'matched' | 'ignored'
  created_at: Date | string
}

export interface MatchCandidate {
  target_id: string
  target_type: 'calendar_event' | 'email_extraction'
  score: number
  details: {
    reservation_code_match?: boolean
    dates_exact?: boolean
    dates_within_tolerance?: number
    source_platform_match?: boolean
    property_similarity?: number
    opaque_provider_identity?: boolean
  }
}

export interface MatchDecision {
  status: 'auto_matched' | 'needs_review' | 'no_match'
  candidates: MatchCandidate[]
  confidence: number
  reason: string
}

type ExtractionWithIdentity = EmailExtractionData & {
  id: string
  organization_id: string
  match_status?: string
}

function dateOnly(value: Date | string | null): string | null {
  if (!value) return null
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
  return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
}

function isOpaqueProviderSummary(summary: string | null): boolean {
  return /^(closed(?:\s*-\s*not available)?|not available|reserved)$/i.test(summary?.trim() || '')
}

function scorePair(email: ExtractionWithIdentity, event: CalendarEvent): MatchCandidate['details'] & { score: number } {
  let score = 0
  const details: MatchCandidate['details'] = {}
  const summary = event.raw_summary || ''

  if (email.reservation_code && summary.toLowerCase().includes(email.reservation_code.toLowerCase())) {
    score += 50
    details.reservation_code_match = true
  }

  const eventIn = dateOnly(event.check_in)
  const eventOut = dateOnly(event.check_out)
  const emailIn = dateOnly(email.check_in)
  const emailOut = dateOnly(email.check_out)
  if (eventIn && eventOut && eventIn === emailIn && eventOut === emailOut) {
    score += 30
    details.dates_exact = true
  } else if (eventIn && eventOut && emailIn && emailOut) {
    const dayMs = 86_400_000
    const inDiff = Math.abs(Date.parse(eventIn) - Date.parse(emailIn)) / dayMs
    const outDiff = Math.abs(Date.parse(eventOut) - Date.parse(emailOut)) / dayMs
    if (inDiff <= 1 && outDiff <= 1) {
      score += 15
      details.dates_within_tolerance = Math.max(inDiff, outDiff)
    }
  }

  if (event.source_platform === email.source_platform) {
    score += 10
    details.source_platform_match = true
  }

  const propertySimilarity = calculateFuzzySimilarity(
    email.property_identifier_raw || '',
    event.property_identifier_raw || ''
  )
  if (propertySimilarity >= 0.6) {
    score += 10
    details.property_similarity = propertySimilarity
  }

  // Booking and Airbnb deliberately redact reservation codes from some iCal
  // summaries. A unique tuple with exact dates/platform and a strong property
  // identity is equivalent evidence, while ties still force human review.
  if (
    !details.reservation_code_match &&
    details.dates_exact &&
    details.source_platform_match &&
    propertySimilarity >= 0.85 &&
    isOpaqueProviderSummary(event.raw_summary)
  ) {
    score += 40
    details.opaque_provider_identity = true
  }

  return { score: Math.min(score, 100), ...details }
}

export function matchEmailToCalendarEvents(
  email: ExtractionWithIdentity,
  calendarEvents: CalendarEvent[]
): MatchCandidate[] {
  return calendarEvents
    .filter((event) => event.organization_id === email.organization_id && event.status === 'unmatched')
    .map((event) => {
      const { score, ...details } = scorePair(email, event)
      return { target_id: event.id, target_type: 'calendar_event' as const, score, details }
    })
    .sort((a, b) => b.score - a.score || a.target_id.localeCompare(b.target_id))
}

export function matchCalendarEventToEmails(
  event: CalendarEvent,
  emailExtractions: ExtractionWithIdentity[]
): MatchCandidate[] {
  return emailExtractions
    .filter((email) => email.organization_id === event.organization_id && (!email.match_status || email.match_status === 'pending'))
    .map((email) => {
      const { score, ...details } = scorePair(email, event)
      return { target_id: email.id, target_type: 'email_extraction' as const, score, details }
    })
    .sort((a, b) => b.score - a.score || a.target_id.localeCompare(b.target_id))
}

export function decideMatch(candidates: MatchCandidate[]): MatchDecision {
  if (candidates.length === 0) {
    return { status: 'no_match', candidates: [], confidence: 0, reason: 'No candidates found' }
  }

  const topScore = candidates[0].score
  const tied = candidates.filter((candidate) => candidate.score === topScore)
  if (tied.length > 1) {
    return {
      status: 'needs_review', candidates: candidates.slice(0, 3), confidence: topScore / 100,
      reason: `Ambiguity: ${tied.length} candidates tied at score ${topScore}`,
    }
  }
  if (topScore >= 80) {
    return { status: 'auto_matched', candidates: [candidates[0]], confidence: topScore / 100, reason: `Auto-match: score ${topScore}` }
  }
  if (topScore >= 40) {
    return { status: 'needs_review', candidates: candidates.slice(0, 3), confidence: topScore / 100, reason: `Needs review: top score ${topScore} < 80` }
  }
  return { status: 'no_match', candidates: [], confidence: topScore / 100, reason: `No match: top score ${topScore} < 40` }
}

export function calculateFuzzySimilarity(first: string, second: string): number {
  const left = first.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
  const right = second.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length)
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= right.length; j++) {
      const above = previous[j]
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
      )
      diagonal = above
    }
  }
  return Math.max(0, 1 - previous[right.length] / Math.max(left.length, right.length))
}
