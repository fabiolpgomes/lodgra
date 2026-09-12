import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { extractEmailData } from '@/lib/email-reconciliation/extract-service'
import { hasRequiredReservationFields, type EmailExtractionPlatform } from '@/lib/email-reconciliation/extraction.schema'
import { isPlatformInPilot } from '@/lib/email-reconciliation/feature-flag'
import { platformFromSender } from '@/lib/email-reconciliation/inbound'
import { syncExtractedDataToReservation } from '@/lib/email-reconciliation/sync-to-reservations'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type ClaimedEmail = {
  id: string
  organization_id: string
  sender: string
  raw_content: string
  attempt_count: number
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[\r\n]+/g, ' ').slice(0, 500)
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error: claimError } = await supabase.rpc('claim_email_reconciliation_batch', {
    p_limit: 20,
  })
  if (claimError) {
    console.error('[EmailReconciliation] Queue claim failed', claimError.message)
    return NextResponse.json({ error: 'Queue claim failed' }, { status: 500 })
  }

  const claimed = (data || []) as ClaimedEmail[]
  const results: Array<Record<string, unknown>> = []

  for (const rawEmail of claimed) {
    const platform = platformFromSender(rawEmail.sender)
    try {
      if (!platform || !(await isPlatformInPilot(rawEmail.organization_id, platform))) {
        const reason = platform ? 'Platform is not enabled for pilot' : 'Sender is not allowlisted'
        await supabase.from('raw_emails').update({
          processing_status: 'rejected', last_error: reason, updated_at: new Date().toISOString(),
        }).eq('id', rawEmail.id).eq('organization_id', rawEmail.organization_id)
        results.push({ emailId: rawEmail.id, success: false, status: 'rejected' })
        continue
      }

      const extraction = await extractEmailData(
        rawEmail.raw_content,
        platform as EmailExtractionPlatform
      )
      if (!extraction.success || !extraction.data) {
        const processingStatus = rawEmail.attempt_count >= 2 ? 'needs_review' : 'retry'
        await supabase.from('raw_emails').update({
          processing_status: processingStatus,
          last_error: safeError(extraction.error || 'Extraction failed'),
          updated_at: new Date().toISOString(),
        }).eq('id', rawEmail.id).eq('organization_id', rawEmail.organization_id)
        results.push({ emailId: rawEmail.id, success: false, status: processingStatus })
        continue
      }

      const complete = hasRequiredReservationFields(extraction.data)
      const { data: inserted, error: insertError } = await supabase
        .from('email_extractions')
        .upsert({
          organization_id: rawEmail.organization_id,
          raw_email_id: rawEmail.id,
          source_platform: platform,
          guest_name: extraction.data.guest_name,
          guest_count: extraction.data.guest_count,
          check_in: extraction.data.check_in,
          check_out: extraction.data.check_out,
          total_value: extraction.data.total_value,
          currency: extraction.data.currency,
          reservation_code: extraction.data.reservation_code,
          property_identifier_raw: extraction.data.property_identifier_raw,
          raw_email_snippet: rawEmail.raw_content.slice(0, 1_000),
          confidence: extraction.confidence,
          match_status: complete ? 'pending' : 'needs_review',
          extraction_version: extraction.version,
          extraction_model: extraction.model,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'organization_id,raw_email_id' })
        .select('id')
        .single()

      if (insertError || !inserted) throw new Error(insertError?.message || 'Extraction persistence failed')

      if (!complete) {
        await supabase.from('raw_emails').update({
          processing_status: 'needs_review', processed_at: new Date().toISOString(),
          last_error: 'Required reservation fields are missing', updated_at: new Date().toISOString(),
        }).eq('id', rawEmail.id).eq('organization_id', rawEmail.organization_id)
        results.push({ emailId: rawEmail.id, success: true, status: 'needs_review' })
        continue
      }

      const reconciliation = await syncExtractedDataToReservation(inserted.id)
      if (!reconciliation.success) throw new Error(reconciliation.error || 'Reconciliation failed')

      if (reconciliation.status !== 'auto_matched') {
        await supabase.from('raw_emails').update({
          processing_status: 'processed', processed_at: new Date().toISOString(),
          last_error: null, updated_at: new Date().toISOString(),
        }).eq('id', rawEmail.id).eq('organization_id', rawEmail.organization_id)
      }
      results.push({
        emailId: rawEmail.id,
        success: true,
        status: reconciliation.status,
        reservationId: reconciliation.reservationId,
      })
    } catch (error) {
      const processingStatus = rawEmail.attempt_count >= 2 ? 'needs_review' : 'retry'
      const message = safeError(error)
      console.error('[EmailReconciliation] Processing failed', { emailId: rawEmail.id, message })
      await supabase.from('raw_emails').update({
        processing_status: processingStatus, last_error: message, updated_at: new Date().toISOString(),
      }).eq('id', rawEmail.id).eq('organization_id', rawEmail.organization_id)
      results.push({ emailId: rawEmail.id, success: false, status: processingStatus, error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
