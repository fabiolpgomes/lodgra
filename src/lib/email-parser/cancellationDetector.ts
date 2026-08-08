import { createAdminClient } from '@/lib/supabase/admin'

/**
 * List of keywords that indicate cancellation
 */
const CANCELLATION_KEYWORDS = {
  // English
  cancel: ['cancel', 'cancelled', 'cancellation', 'void', 'voided', 'declined', 'failed', 'not confirmed', 'unconfirmed'],

  // Portuguese
  portuguese: ['cancelar', 'cancelada', 'cancelado', 'cancelamento', 'cancelação', 'reembolso', 'recusado', 'falhou', 'não confirmado'],

  // Other common patterns
  refund: ['refund', 'reembolso', 'devolvido'],
  failed: ['payment failed', 'falha no pagamento'],
  decline: ['declined', 'decline', 'declinado', 'recusado']
}

/**
 * Check if email subject/body indicates cancellation
 *
 * @param email_subject - Email subject line
 * @param email_body - Email body content
 * @returns true if cancellation detected
 */
export function isCancellationEmail(email_subject: string, email_body: string): boolean {
  if (!email_subject && !email_body) return false

  const text = `${email_subject} ${email_body}`.toLowerCase()

  // Check all keyword categories
  const all_keywords = Object.values(CANCELLATION_KEYWORDS).flat()

  // Count keyword matches
  let keyword_count = 0
  for (const keyword of all_keywords) {
    if (text.includes(keyword)) {
      keyword_count++
    }
  }

  // If 2+ keywords found, likely a cancellation
  if (keyword_count >= 2) {
    console.log(`[cancellationDetector] ✅ Cancellation detected (${keyword_count} keywords)`)
    return true
  }

  // Special case: "cancelled" alone is enough
  if (all_keywords.some(kw => text.includes(kw) && kw === 'cancelled')) {
    console.log(`[cancellationDetector] ✅ Cancellation detected (keyword: 'cancelled')`)
    return true
  }

  console.log(`[cancellationDetector] Not a cancellation email (${keyword_count} keywords)`)
  return false
}

/**
 * Update reservation status to cancelled and log timestamp
 *
 * @param reservation_id - Reservation to cancel
 * @param cancellation_reason - Reason for cancellation (from email)
 * @returns true if successful
 */
export async function markReservationCancelled(
  reservation_id: string,
  cancellation_reason: string = 'Cancelled via email'
): Promise<boolean> {
  try {
    const supabase = await createAdminClient()

    const { error } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_timestamp: new Date().toISOString(),
        cancellation_notes: cancellation_reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', reservation_id)

    if (error) {
      console.error(`[cancellationDetector] Error marking cancelled:`, error)
      return false
    }

    console.log(`[cancellationDetector] ✅ Marked reservation ${reservation_id} as cancelled`)
    return true
  } catch (err) {
    console.error(`[cancellationDetector] Error marking cancelled:`, err)
    return false
  }
}

/**
 * Extract cancellation date from email body
 * Looks for patterns like:
 * - "Cancelled on 2026-08-15"
 * - "Cancellation date: 15/08/2026"
 */
export function extractCancellationDate(email_body: string): string | null {
  if (!email_body) return null

  // ISO format: 2026-08-15
  const iso_match = email_body.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso_match) return iso_match[1]

  // DD/MM/YYYY format: 15/08/2026
  const slash_match = email_body.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (slash_match) {
    const [, day, month, year] = slash_match
    return `${year}-${String(Number(month)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
  }

  return null
}

/**
 * Find reservation to cancel based on email cancellation data
 *
 * @param property_id - Property ID
 * @param confirmation_id - Booking confirmation/reference ID from email
 * @returns reservation_id if found, null otherwise
 */
export async function findReservationToCancelByConfirmation(
  property_id: string,
  confirmation_id: string
): Promise<string | null> {
  try {
    const supabase = await createAdminClient()

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('property_id', property_id)
      .eq('booking_reference', confirmation_id)
      .not('status', 'eq', 'cancelled')
      .single()

    if (error) {
      console.log(`[cancellationDetector] No reservation found for confirmation ${confirmation_id}`)
      return null
    }

    return reservation?.id || null
  } catch (err) {
    console.error(`[cancellationDetector] Error finding reservation:`, err)
    return null
  }
}
