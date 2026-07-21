import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractEmailData } from '@/lib/email-reconciliation/extract-service'

export const maxDuration = 300

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()

    // Get all pending raw_emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('raw_emails')
      .select('*')
      .eq('processing_status', 'pending')
      .limit(20)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending emails' })
    }

    const results = []

    for (const rawEmail of pendingEmails) {
      try {
        // Extract data from email
        const extraction = await extractEmailData(rawEmail.raw_content)

        // Determine platform from sender
        const platform = rawEmail.sender?.toLowerCase().includes('airbnb')
          ? 'airbnb'
          : rawEmail.sender?.toLowerCase().includes('booking')
            ? 'booking'
            : rawEmail.sender?.toLowerCase().includes('vrbo')
              ? 'vrbo'
              : null

        // Insert into email_extractions
        const { error: insertError } = await supabase.from('email_extractions').insert({
          organization_id: rawEmail.organization_id,
          raw_email_id: rawEmail.id,
          source_platform: platform,
          guest_name: extraction.data?.guest_name || null,
          check_in: extraction.data?.check_in || null,
          check_out: extraction.data?.check_out || null,
          number_of_guests: extraction.data?.number_of_guests || null,
          total_value: extraction.data?.total_value || null,
          currency: extraction.data?.currency || null,
          reservation_code: extraction.data?.reservation_code || null,
          property_name: extraction.data?.property_name || null,
          confidence: extraction.confidence,
          match_status: extraction.success ? 'pending' : 'needs_review',
          extraction_notes: extraction.error || null,
        })

        if (insertError) {
          results.push({
            emailId: rawEmail.id,
            success: false,
            error: insertError.message,
          })
          continue
        }

        // Update raw_email status
        await supabase
          .from('raw_emails')
          .update({
            processing_status: extraction.success ? 'processed' : 'needs_review',
            last_error: extraction.success ? null : extraction.error,
          })
          .eq('id', rawEmail.id)

        results.push({
          emailId: rawEmail.id,
          success: extraction.success,
          confidence: extraction.confidence,
          guestName: extraction.data?.guest_name,
        })
      } catch (error) {
        results.push({
          emailId: rawEmail.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
