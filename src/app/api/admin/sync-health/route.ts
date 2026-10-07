import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
const LIMIT = 50

export async function GET() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })

  try {
    const db = await createAdminClient()
    const today = new Date().toISOString().slice(0, 10)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const results = await Promise.all([
      db.from('raw_emails').select('id, processing_status, received_at, last_error')
        .eq('organization_id', auth.organizationId)
        .in('processing_status', ['pending', 'retry', 'processing', 'needs_review'])
        .order('received_at', { ascending: true }).limit(LIMIT + 1),
      db.from('email_connections').select('last_sync_at')
        .eq('organization_id', auth.organizationId).limit(1),
      db.from('calendar_events').select('id, property_id, source_platform, check_in, check_out, event_kind')
        .eq('organization_id', auth.organizationId).eq('status', 'unmatched')
        .is('reservation_id', null).gte('check_out', today)
        .order('check_in', { ascending: true }).limit(LIMIT + 1),
      db.from('sync_logs').select('id, synced_at, sync_type, error_message, property_listings!inner(organization_id)')
        .eq('property_listings.organization_id', auth.organizationId)
        .eq('status', 'failed').gte('synced_at', since)
        .order('synced_at', { ascending: false }).limit(LIMIT + 1),
      db.from('raw_emails').select('received_at')
        .eq('organization_id', auth.organizationId)
        .order('received_at', { ascending: false }).limit(1),
    ])
    if (results.some(result => result.error)) {
      return NextResponse.json({ error: 'Não foi possível consultar as pendências de sincronização.' }, { status: 503 })
    }
    const emails = results[0].data ?? []
    const gmail = results[1].data ?? []
    const events = results[2].data ?? []
    const failures = results[3].data ?? []
    const latestEmail = results[4].data ?? []
    return NextResponse.json({
      checked_at: new Date().toISOString(),
      limit: LIMIT,
      emails: emails.slice(0, LIMIT),
      gmail_connected: gmail.length > 0,
      gmail_last_sync_at: gmail[0]?.last_sync_at ?? null,
      last_email_received_at: latestEmail[0]?.received_at ?? null,
      events: events.slice(0, LIMIT),
      failures: failures.slice(0, LIMIT).map(({ id, synced_at, sync_type, error_message }) => ({ id, synced_at, sync_type, error_message })),
      truncated: { emails: emails.length > LIMIT, events: events.length > LIMIT, failures: failures.length > LIMIT },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar as pendências de sincronização.' }, { status: 503 })
  }
}
