import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

type ConfirmationBody = {
  extraction_id?: string
  selected_candidate?: string
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organization unavailable' }, { status: 403 })
  }

  let body: ConfirmationBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body.extraction_id || !body.selected_candidate) {
    return NextResponse.json({ error: 'extraction_id and selected_candidate are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: extraction, error: extractionError } = await supabase
    .from('email_extractions')
    .select('id')
    .eq('id', body.extraction_id)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()

  if (extractionError) return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  if (!extraction) return NextResponse.json({ error: 'Extraction not found' }, { status: 404 })

  const { data, error } = await supabase.rpc('reconcile_email_extraction', {
    p_extraction_id: body.extraction_id,
    p_event_id: body.selected_candidate,
    p_confirmed_by_host: true,
  })
  if (error) {
    console.error('[EmailReconciliation] Manual confirmation failed', error.message)
    return NextResponse.json({ error: 'Unable to reconcile selection' }, { status: 409 })
  }

  return NextResponse.json({ success: true, result: data })
}
