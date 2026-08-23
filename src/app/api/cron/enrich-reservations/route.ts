import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

interface EnrichmentResult {
  enriched: number
  skipped: number
  errors: number
  errorDetails: Array<{
    email: string
    guest_name: string | null
    type: string
    message: string
  }>
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const results: EnrichmentResult = { enriched: 0, skipped: 0, errors: 0, errorDetails: [] }

    // ═══ PHASE 1: Fetch parsed emails with property_id ═══════════════════════════════════
    // Only process emails that:
    // - Have property_id detected
    // - Have parsed_data (parser succeeded)
    // - Have reservation_id (reservation was created)
    // - Are not yet enriched (status != 'enriched')
    const { data: emails, error: emailsError } = await supabase
      .from('email_parse_log')
      .select('id, platform, property_id, parsed_data, reservation_id, created_at')
      .not('property_id', 'is', null)
      .not('parsed_data', 'is', null)
      .not('reservation_id', 'is', null)
      .not('status', 'eq', 'enriched')
      .neq('status', 'error')
      .order('created_at', { ascending: true })
      .limit(100)

    if (emailsError) {
      console.error('[enrich-reservations] Error fetching emails:', emailsError)
      return NextResponse.json({ error: emailsError.message, ...results }, { status: 500 })
    }

    if (!emails || emails.length === 0) {
      console.log('[enrich-reservations] No pending emails to enrich')
      return NextResponse.json({ success: true, message: 'No emails to process', ...results })
    }

    console.log(`[enrich-reservations] ✅ Processing ${emails.length} emails... [v3-fixed-schema]`)

    // ═══ PHASE 2 & 3: Match and Enrich ════════════════════════════════════════════════════
    for (const email of emails) {
      try {
        const parsed = email.parsed_data as {
          guest_name?: string | null
          checkin_date?: string | null
          checkout_date?: string | null
          amount?: number | null
          currency?: string | null
          platform?: string
          confirmation_code?: string | null
          num_guests?: number | null
        } | null

        if (!parsed) {
          console.log(`[enrich-reservations] No parsed data for email ${email.id}`)
          results.skipped++
          await supabase
            .from('email_parse_log')
            .update({ status: 'error', error_message: 'Parsed email data missing' })
            .eq('id', email.id)
          continue
        }

        // ═══ PHASE 2: Get matching reservation ═══════════════════════════════════════════
        // reservation_id is already set by email-parser, so just fetch it
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select('id, first_name, last_name, number_of_guests, currency')
          .eq('id', email.reservation_id)
          .single()

        if (resError || !reservation) {
          console.log(`[enrich-reservations] Reservation not found for email ${email.id} (res_id: ${email.reservation_id})`)
          results.skipped++
          await supabase
            .from('email_parse_log')
            .update({
              status: 'error',
              error_message: `Reservation ${email.reservation_id} not found in DB`
            })
            .eq('id', email.id)
          continue
        }

        // ═══ PHASE 3: Enrich reservation ═════════════════════════════════════════════════
        // Update: first_name, last_name, number_of_guests, amount, email_enriched_at
        const updates: Record<string, any> = {
          email_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Extract first and last names from guest_name
        if (parsed.guest_name) {
          const nameParts = parsed.guest_name.trim().split(/\s+/)
          if (nameParts.length >= 2) {
            updates.first_name = nameParts[0]
            updates.last_name = nameParts.slice(1).join(' ')
          } else if (nameParts.length === 1) {
            updates.first_name = nameParts[0]
            updates.last_name = ''
          }
        }

        // Update number of guests if provided
        if (parsed.num_guests && parsed.num_guests > 0) {
          updates.number_of_guests = parsed.num_guests
        }

        // Update amount if provided
        if (parsed.amount && parsed.amount > 0) {
          updates.amount = parsed.amount
          updates.currency = parsed.currency ?? reservation.currency ?? null
        }

        const { error: updateError } = await supabase
          .from('reservations')
          .update(updates)
          .eq('id', reservation.id)

        if (updateError) {
          console.error(`[enrich-reservations] Error updating reservation ${reservation.id}:`, updateError)
          results.errors++
          results.errorDetails.push({
            email: email.platform || 'unknown',
            guest_name: parsed.guest_name || null,
            type: 'update_error',
            message: updateError.message
          })
          await supabase
            .from('email_parse_log')
            .update({ status: 'error', error_message: `Update failed: ${updateError.message}` })
            .eq('id', email.id)
          continue
        }

        // Mark email as successfully enriched
        const { error: logError } = await supabase
          .from('email_parse_log')
          .update({
            status: 'enriched',
            matched_reservation_id: reservation.id,
            enriched_at: new Date().toISOString()
          })
          .eq('id', email.id)

        if (logError) {
          console.warn(`[enrich-reservations] Error updating email_parse_log ${email.id}:`, logError)
        }

        results.enriched++
        console.log(`[enrich-reservations] ✅ Enriched reservation ${reservation.id} from email ${email.id}`)
      } catch (err) {
        console.error(`[enrich-reservations] Error processing email ${email.id}:`, err)
        results.errors++
        results.errorDetails.push({
          email: email.platform || 'unknown',
          guest_name: email.parsed_data?.guest_name || null,
          type: 'processing_error',
          message: err instanceof Error ? err.message : 'Unknown error'
        })

        // Mark as error in log
        try {
          await supabase
            .from('email_parse_log')
            .update({ status: 'error', error_message: err instanceof Error ? err.message : 'Unknown error' })
            .eq('id', email.id)
        } catch (logErr) {
          console.error('Failed to update error status:', logErr)
        }
      }
    }

    console.log('[enrich-reservations] Job complete:', results)
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    console.error('[enrich-reservations] Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
