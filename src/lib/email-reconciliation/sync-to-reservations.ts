import { createAdminClient } from '@/lib/supabase/admin'
import { calculateFuzzySimilarity } from './matching-engine'

// Below this, we don't trust a property-name match enough to auto-sync.
const PROPERTY_MATCH_THRESHOLD = 0.6
// Minimum gap between the best and second-best candidate to call it
// unambiguous. Two similarly-scored candidates means we shouldn't guess.
const MIN_WINNER_MARGIN = 0.15

interface ReservationCandidate {
  id: string
  property_listing_id: string | null
  property_listings: Array<{ property_id: string; properties: Array<{ name: string }> | null }> | null
}

function getPropertyName(candidate: ReservationCandidate): string {
  const propListing = candidate.property_listings?.[0]
  if (!propListing) return ''
  const properties = propListing.properties
  if (!Array.isArray(properties) || properties.length === 0) return ''
  return properties[0].name || ''
}

export async function syncExtractedDataToReservation(extractionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient()

    // 1. Get extraction data
    const { data: extraction, error: extractionError } = await supabase
      .from('email_extractions')
      .select('*')
      .eq('id', extractionId)
      .single()

    if (extractionError || !extraction) {
      console.error(`Sync: Extraction not found`, { extractionId, error: extractionError })
      return { success: false, error: 'Extraction not found' }
    }

    // Skip if already matched
    if (extraction.match_status === 'auto_matched') {
      return { success: true }
    }

    // 2. Find candidate reservations by EXACT dates, org-scoped.
    // Note: reservations don't carry the human-readable "BK123ABC"-style
    // confirmation code anywhere (they're created by the sync-ical cron from
    // the iCal feed, which only has a numeric platform id — see
    // buildStableExternalId in cron/sync-ical/route.ts). So reservation_code
    // from the email can't be matched against anything in the DB today.
    // A single property_listing can't have two overlapping reservations
    // (sync-ical already enforces that at creation time), so exact-date +
    // property is the reliable key across an org with multiple properties.
    const { data: candidates, error: reservationError } = await supabase
      .from('reservations')
      .select('id, property_listing_id, property_listings(property_id, properties(name))')
      .eq('organization_id', extraction.organization_id)
      .eq('check_in', extraction.check_in)
      .eq('check_out', extraction.check_out)

    if (reservationError) {
      console.error(`Sync: Error finding reservation`, { error: reservationError })
      return { success: false, error: reservationError.message }
    }

    if (!candidates || candidates.length === 0) {
      console.warn(`Sync: No matching reservation found`, { extractionId, checkIn: extraction.check_in, checkOut: extraction.check_out })
      // Don't fail - reservation might not be created yet (email can arrive
      // before the next sync-ical run picks up the booking).
      return { success: true }
    }

    let reservationId: string

    if (candidates.length === 1) {
      reservationId = candidates[0].id
    } else {
      // 2b. Multiple reservations share these exact dates - different
      // properties. Disambiguate using the property name extracted from the
      // email (fuzzy match), never guess blindly.
      if (!extraction.property_name) {
        console.warn(`Sync: Ambiguous date match and no property_name to disambiguate`, {
          extractionId,
          checkIn: extraction.check_in,
          checkOut: extraction.check_out,
          candidateCount: candidates.length,
        })
        await supabase.from('email_extractions').update({ match_status: 'needs_review' }).eq('id', extractionId)
        return { success: true }
      }

      const scored = candidates
        .map((c) => ({
          id: c.id,
          similarity: calculateFuzzySimilarity(extraction.property_name as string, getPropertyName(c)),
        }))
        .sort((a, b) => b.similarity - a.similarity)

      const best = scored[0]
      const secondBest = scored[1]
      const marginOk = !secondBest || best.similarity - secondBest.similarity >= MIN_WINNER_MARGIN

      if (best.similarity >= PROPERTY_MATCH_THRESHOLD && marginOk) {
        reservationId = best.id
      } else {
        console.warn(`Sync: Ambiguous property match - refusing to guess`, {
          extractionId,
          propertyName: extraction.property_name,
          scored,
        })
        await supabase.from('email_extractions').update({ match_status: 'needs_review' }).eq('id', extractionId)
        return { success: true }
      }
    }

    // 3. Prepare update data
    const updateData: Record<string, unknown> = {
      email_extraction_id: extractionId,
    }

    // Update guest name (split if possible)
    if (extraction.guest_name) {
      const nameParts = extraction.guest_name.trim().split(' ')
      updateData.first_name = nameParts[0]
      updateData.last_name = nameParts.slice(1).join(' ') || nameParts[0]
    }

    // Update phone
    if (extraction.phone) {
      updateData.guest_phone = extraction.phone
    }

    // Update total amount
    if (extraction.total_value) {
      updateData.total_amount = extraction.total_value
    }

    // 4. Update reservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId)

    if (updateError) {
      console.error(`Sync: Error updating reservation`, { reservationId, error: updateError })
      return { success: false, error: updateError.message }
    }

    // 5. Mark extraction as matched
    await supabase
      .from('email_extractions')
      .update({
        match_status: 'auto_matched',
      })
      .eq('id', extractionId)

    console.info(`Sync: Successfully synced extraction to reservation`, { extractionId, reservationId })
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Sync: Unexpected error`, { error: errorMessage })
    return { success: false, error: errorMessage }
  }
}
