import { createAdminClient } from '@/lib/supabase/admin'

interface ReservationCandidate {
  id: string
  check_in: string
  check_out: string
  guest_name: string | null
  first_name: string | null
  last_name: string | null
}

interface MatchScore {
  reservation_id: string
  score: number
  reason: string
}

/**
 * Calculate string similarity (Levenshtein-like, simplified)
 * Returns score between 0 and 100
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0

  const s1 = name1.toLowerCase().trim()
  const s2 = name2.toLowerCase().trim()

  // Exact match
  if (s1 === s2) return 100

  // One is substring of other
  if (s1.includes(s2) || s2.includes(s1)) return 85

  // Split by space and check partial matches
  const parts1 = s1.split(/\s+/)
  const parts2 = s2.split(/\s+/)

  // Check if last names match (usually last part)
  if (parts1.length > 0 && parts2.length > 0) {
    if (parts1[parts1.length - 1] === parts2[parts2.length - 1]) return 75
  }

  // Check first name match
  if (parts1[0] === parts2[0]) return 70

  // Partial word match (at least 4 chars in common)
  const common = parts1.filter(p => parts2.some(q => q.includes(p) || p.includes(q)))
  if (common.length > 0) return 60

  return 0
}

/**
 * Calculate date overlap (in days)
 * Returns 100 if dates match exactly, decreases with partial overlap
 */
function calculateDateMatch(
  res_check_in: string,
  res_check_out: string,
  email_check_in: string,
  email_check_out: string
): number {
  if (!email_check_in || !email_check_out) return 50 // Neutral if no date in email

  // Parse dates (assume YYYY-MM-DD format)
  const res_in = new Date(res_check_in).getTime()
  const res_out = new Date(res_check_out).getTime()
  const email_in = new Date(email_check_in).getTime()
  const email_out = new Date(email_check_out).getTime()

  // Exact match
  if (res_in === email_in && res_out === email_out) return 100

  // Overlap but different
  if (res_in <= email_out && res_out >= email_in) {
    // Calculate overlap days
    const overlap_start = Math.max(res_in, email_in)
    const overlap_end = Math.min(res_out, email_out)
    const overlap_days = (overlap_end - overlap_start) / (1000 * 60 * 60 * 24)
    const total_days = (res_out - res_in) / (1000 * 60 * 60 * 24)

    if (total_days <= 0) return 0
    const overlap_percent = Math.round((overlap_days / total_days) * 100)
    return Math.max(50, overlap_percent) // At least 50 for any overlap
  }

  return 0 // No overlap
}

/**
 * Find best matching iCal reservation for email data
 *
 * @param property_id - Property to search in
 * @param email_check_in - Check-in date from email (YYYY-MM-DD)
 * @param email_check_out - Check-out date from email
 * @param email_guest_name - Guest name from email
 * @returns reservation_id if match found (score >= 80), null otherwise
 */
export async function findMatchingICalReservation(
  property_id: string,
  email_check_in: string | null,
  email_check_out: string | null,
  email_guest_name: string | null
): Promise<string | null> {
  try {
    if (!email_check_in || !email_check_out) {
      console.log(`[reservationMatcher] No dates in email, cannot match`)
      return null
    }

    const supabase = await createAdminClient()

    // Query all active reservations for this property within 7 days of email dates
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, check_in, check_out, guest_name, first_name, last_name')
      .eq('property_id', property_id)
      .not('status', 'eq', 'cancelled')

    if (error) {
      console.error(`[reservationMatcher] Error querying reservations:`, error)
      return null
    }

    if (!reservations || reservations.length === 0) {
      console.log(`[reservationMatcher] No reservations found for property ${property_id}`)
      return null
    }

    // Score all candidates
    const scores: MatchScore[] = reservations
      .map((res: ReservationCandidate) => {
        const date_score = calculateDateMatch(res.check_in, res.check_out, email_check_in, email_check_out)
        const name_score = email_guest_name
          ? calculateNameSimilarity(email_guest_name, res.guest_name || res.first_name || '')
          : 50

        // Weighted average: dates 60%, name 40%
        const total_score = date_score * 0.6 + name_score * 0.4

        return {
          reservation_id: res.id,
          score: Math.round(total_score),
          reason: `date_score=${date_score}, name_score=${name_score}`
        }
      })
      .sort((a, b) => b.score - a.score)

    console.log(`[reservationMatcher] Scored ${scores.length} candidates`, scores.slice(0, 3))

    // Return best match if score >= 80
    if (scores[0] && scores[0].score >= 80) {
      console.log(
        `[reservationMatcher] ✅ Best match: reservation_id=${scores[0].reservation_id}, score=${scores[0].score}`
      )
      return scores[0].reservation_id
    }

    console.log(
      `[reservationMatcher] ⚠️ Best score too low: ${scores[0]?.score || 0} < 80 (no match)`
    )
    return null
  } catch (err) {
    console.error(`[reservationMatcher] Error finding match:`, err)
    return null
  }
}

/**
 * Enrich existing reservation with email data
 *
 * @param reservation_id - Reservation to update
 * @param email_data - Data from email (guest name, amounts, confirmation_id)
 */
export async function enrichReservationWithEmail(
  reservation_id: string,
  email_data: {
    first_name?: string
    last_name?: string
    guest_name?: string
    confirmation_id?: string
    platform?: string
    platform_url?: string
    amount?: number
  }
): Promise<boolean> {
  try {
    const supabase = await createAdminClient()

    // Build update object, only including non-empty values
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      platform_synced_at: new Date().toISOString()
    }

    if (email_data.first_name) updates.first_name = email_data.first_name
    if (email_data.last_name) updates.last_name = email_data.last_name
    if (email_data.guest_name) updates.guest_name = email_data.guest_name
    if (email_data.confirmation_id) {
      updates.booking_reference = email_data.confirmation_id
      updates.external_id = `${email_data.platform}_${email_data.confirmation_id}`
    }
    if (email_data.platform) updates.booking_source = email_data.platform.toLowerCase()
    if (email_data.platform_url) updates.platform_sync_url = email_data.platform_url

    const { error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', reservation_id)

    if (error) {
      console.error(`[reservationMatcher] Error enriching reservation:`, error)
      return false
    }

    console.log(
      `[reservationMatcher] ✅ Enriched reservation ${reservation_id}: ${JSON.stringify(updates)}`
    )
    return true
  } catch (err) {
    console.error(`[reservationMatcher] Error enriching reservation:`, err)
    return false
  }
}
