import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { ingestGmail } from '@/lib/email-reconciliation/gmail-ingestion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Queue batches processed per manual run (5 e-mails each) — keeps the request well inside maxDuration. */
const MAX_QUEUE_BATCHES = 4

type StepResult = { ok: boolean; error?: string }

/**
 * "Sincronizar agora": the same cycle the scheduler runs, on demand and scoped to the tenant —
 * calendars (iCal), Gmail, then the e-mail ↔ calendar reconciliation queue.
 * Every step runs even if a previous one fails, so one broken source never hides the others.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Sincronização indisponível' }, { status: 503 })

  const origin = request.nextUrl.origin
  const headers = { Authorization: `Bearer ${secret}` }

  const ical: StepResult & { created?: number; updated?: number; errors?: number } = { ok: false }
  try {
    const response = await fetch(`${origin}/api/cron/sync-ical?manual=true&organization_id=${auth.organizationId}`, { headers })
    const body = await response.json().catch(() => ({}))
    Object.assign(ical, {
      ok: response.ok && !body.errors,
      created: Number(body.created) || 0,
      updated: Number(body.updated) || 0,
      errors: Number(body.errors) || 0,
      ...(response.ok ? {} : { error: 'ICAL_SYNC_FAILED' }),
    })
  } catch { ical.error = 'ICAL_SYNC_UNAVAILABLE' }

  const email: StepResult & { staged?: number; connected?: boolean } = { ok: false }
  try {
    const result = await ingestGmail(auth.organizationId)
    Object.assign(email, { ok: result.errors === 0, staged: result.staged, connected: result.connections > 0 })
    if (result.errors) email.error = 'GMAIL_SYNC_FAILED'
  } catch { email.error = 'GMAIL_SYNC_UNAVAILABLE' }

  const reconciliation: StepResult & { processed: number; matched: number } = { ok: true, processed: 0, matched: 0 }
  try {
    for (let batch = 0; batch < MAX_QUEUE_BATCHES; batch++) {
      const response = await fetch(`${origin}/api/email-extraction/process-pending`, { method: 'POST', headers })
      const body = await response.json().catch(() => ({}))
      const results: Array<{ status?: string }> = Array.isArray(body.results) ? body.results : []
      reconciliation.processed += results.length
      reconciliation.matched += results.filter(result => result.status === 'auto_matched').length
        + (Number(body.replay?.matched) || 0)
      if (!response.ok) { reconciliation.ok = false; reconciliation.error = 'RECONCILIATION_FAILED' }
      if (!response.ok || results.length === 0) break
    }
  } catch { reconciliation.ok = false; reconciliation.error = 'RECONCILIATION_UNAVAILABLE' }

  const ok = ical.ok && (email.ok || email.connected === false) && reconciliation.ok
  return NextResponse.json({ success: ok, ical, email, reconciliation, finished_at: new Date().toISOString() }, { status: ok ? 200 : 207 })
}
