import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ConfirmationAction } from '@/lib/email-reconciliation/ui-types'

export async function POST(request: NextRequest) {
  try {
    const action: ConfirmationAction = await request.json()
    const supabase = await createAdminClient()
    const organizationId = request.headers.get('x-organization-id')

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 })
    }

    // Update email extraction with match status
    const { error } = await supabase
      .from('email_extractions')
      .update({
        match_status: action.type === 'auto_matched' ? 'matched' : 'needs_review',
        matched_calendar_event_id: action.selected_candidate,
        confirmed_at: action.timestamp,
      })
      .eq('id', action.extraction_id)
      .eq('organization_id', organizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, extraction_id: action.extraction_id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
