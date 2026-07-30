import { createAdminClient } from '@/lib/supabase/admin'

interface ReservationScore {
  id: string
  score: number
  details: {
    reservation_code_match?: boolean
    dates_exact?: boolean
    dates_within_tolerance?: number
  }
}

function scoreReservationMatch(
  extraction: any,
  reservation: any
): number {
  let score = 0

  // Rule 1: external_booking_id match (50 points) — most reliable
  if (extraction.reservation_code && reservation.external_booking_id) {
    if (extraction.reservation_code.toLowerCase() === reservation.external_booking_id.toLowerCase()) {
      score += 50
      return score // Skip other checks if code matches perfectly
    }
  }

  // Rule 2: exact date match (30 points)
  const resCheckIn = new Date(reservation.check_in).toISOString().split('T')[0]
  const resCheckOut = new Date(reservation.check_out).toISOString().split('T')[0]
  const extCheckIn = new Date(extraction.check_in).toISOString().split('T')[0]
  const extCheckOut = new Date(extraction.check_out).toISOString().split('T')[0]

  if (resCheckIn === extCheckIn && resCheckOut === extCheckOut) {
    score += 30
  } else {
    // Rule 3: dates within ±1 day (15 points)
    const checkInDiff = Math.abs(
      (new Date(reservation.check_in).getTime() - new Date(extraction.check_in).getTime()) / (1000 * 60 * 60 * 24)
    )
    const checkOutDiff = Math.abs(
      (new Date(reservation.check_out).getTime() - new Date(extraction.check_out).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (checkInDiff <= 1 && checkOutDiff <= 1) {
      score += 15
    }
  }

  return score
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

    // Skip if already synced
    if (extraction.sync_status === 'synced') {
      return { success: true }
    }

    // 2. Find matching reservations using intelligent scoring
    const { data: candidates, error: queryError } = await supabase
      .from('reservations')
      .select('id, organization_id, external_booking_id, check_in, check_out')
      .eq('organization_id', extraction.organization_id)
      .gte('check_in', new Date(extraction.check_in).toISOString().split('T')[0])
      .lte('check_out', new Date(extraction.check_out).toISOString().split('T')[0])

    if (queryError) {
      console.error(`Sync: Error finding reservations`, { error: queryError })
      return { success: false, error: queryError.message }
    }

    if (!candidates || candidates.length === 0) {
      console.warn(`Sync: No matching reservation found`, { extractionId, checkIn: extraction.check_in, checkOut: extraction.check_out })
      // Don't fail - reservation might not be created yet
      return { success: true }
    }

    // Score all candidates and pick the best match
    const scored: ReservationScore[] = candidates.map((candidate) => ({
      id: candidate.id,
      score: scoreReservationMatch(extraction, candidate),
      details: {},
    }))

    scored.sort((a, b) => b.score - a.score)
    const bestMatch = scored[0]

    if (bestMatch.score === 0) {
      console.warn(`Sync: No high-confidence match found`, { extractionId, candidates: scored })
      return { success: true } // Don't fail, but don't sync either
    }

    const reservationId = bestMatch.id

    // 3. Prepare update data
    const updateData: any = {
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

    // 5. Mark extraction as synced
    await supabase
      .from('email_extractions')
      .update({
        sync_status: 'synced',
        synced_at: new Date().toISOString(),
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
