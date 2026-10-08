import type { EmailExtraction } from './extraction.schema'
import { isOpaqueProviderSummary } from './matching-engine'

/** Same placeholder the iCal importer uses; the dashboard alerts the host to complete it. */
export const PLACEHOLDER_GUEST_NAME = 'Hóspede'

/**
 * Booking's "Nova reserva!" e-mail only carries the reservation code, the check-in date and the
 * listing name. The opaque Booking iCal block carries the check-out. Together they identify the stay.
 */
export function isBookingPartialConfirmation(
  data: Pick<EmailExtraction, 'source_platform' | 'check_in' | 'check_out' | 'reservation_code'>
): boolean {
  return data.source_platform === 'booking' && Boolean(data.check_in && data.reservation_code?.trim()) && !data.check_out
}

export type BookingAnchorCandidate = {
  id: string
  check_in: string
  check_out: string
  raw_summary: string | null
  property_name: string | null
}

export type BookingAnchorDecision =
  | { status: 'matched'; event: BookingAnchorCandidate }
  | { status: 'needs_review' | 'no_match'; reason: string }

const STOPWORDS = new Set(['ahs', 'com', 'and', 'the', 'for', 'para', 'por', 'das', 'dos', 'min', 'booking'])

function tokens(value: string | null): Set<string> {
  const normalized = (value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return new Set(normalized.split(/[^a-z0-9]+/).filter(token => token.length >= 3 && !STOPWORDS.has(token)))
}

/** Share of the smaller name's distinctive words that also appear in the other name. */
export function listingNameOverlap(first: string | null, second: string | null): number {
  const left = tokens(first)
  const right = tokens(second)
  const smaller = Math.min(left.size, right.size)
  if (!smaller) return 0
  let shared = 0
  for (const token of left) if (right.has(token)) shared++
  return shared / smaller
}

const MIN_OVERLAP = 0.5
const MIN_MARGIN = 0.2

/** Picks the single opaque Booking block that starts on the check-in day for the e-mail's listing. */
export function chooseBookingAnchor(
  propertyIdentifier: string | null,
  candidates: BookingAnchorCandidate[]
): BookingAnchorDecision {
  const scored = candidates
    .filter(candidate => isOpaqueProviderSummary(candidate.raw_summary))
    .map(candidate => ({ candidate, overlap: listingNameOverlap(propertyIdentifier, candidate.property_name) }))
    .sort((a, b) => b.overlap - a.overlap || a.candidate.id.localeCompare(b.candidate.id))

  if (!scored.length) return { status: 'no_match', reason: 'No Booking block starts on the check-in date' }
  const [top, second] = scored
  if (top.overlap < MIN_OVERLAP) return { status: 'needs_review', reason: 'Listing name does not match the calendar property' }
  if (second && top.overlap - second.overlap < MIN_MARGIN) return { status: 'needs_review', reason: 'More than one property fits the listing name' }
  return { status: 'matched', event: top.candidate }
}
