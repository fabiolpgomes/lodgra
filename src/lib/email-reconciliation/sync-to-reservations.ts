import { createAdminClient } from '@/lib/supabase/admin'

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

    // 2. Find matching reservation
    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('id, organization_id')
      .eq('organization_id', extraction.organization_id)
      .gte('check_in', extraction.check_in)
      .lte('check_out', extraction.check_out)
      .limit(1)

    if (reservationError) {
      console.error(`Sync: Error finding reservation`, { error: reservationError })
      return { success: false, error: reservationError.message }
    }

    if (!reservations || reservations.length === 0) {
      console.warn(`Sync: No matching reservation found`, { extractionId, checkIn: extraction.check_in, checkOut: extraction.check_out })
      // Don't fail - reservation might not be created yet
      return { success: true }
    }

    const reservationId = reservations[0].id

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
