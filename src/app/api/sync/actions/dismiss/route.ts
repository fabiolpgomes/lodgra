import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

/** Only problems the host can judge may be dismissed; a broken Gmail/queue/calendar must be fixed. */
const DISMISSIBLE = /^(event|message|guest|changed):[0-9a-f-]{36}$/i

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })
  const body = await request.json().catch(() => null) as { key?: unknown; reason?: unknown } | null
  const key = typeof body?.key === 'string' ? body.key : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 300) : ''
  if (!DISMISSIBLE.test(key)) return NextResponse.json({ error: 'Esta ação não pode ser ignorada.' }, { status: 400 })
  if (!reason) return NextResponse.json({ error: 'Indique o motivo.' }, { status: 400 })

  const db = await createAdminClient()
  const { error } = await db.from('sync_action_states').upsert({
    organization_id: auth.organizationId, action_key: key, dismissed_at: new Date().toISOString(),
    dismissed_by: auth.userId ?? null, dismiss_reason: reason, updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,action_key' })
  if (error) return NextResponse.json({ error: 'Não foi possível guardar. Tente novamente.' }, { status: 503 })
  return NextResponse.json({ success: true })
}
