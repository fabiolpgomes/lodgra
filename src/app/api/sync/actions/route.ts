import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSyncHealth } from '@/lib/sync-health/load'

export const dynamic = 'force-dynamic'

/** What the tenant has to do about sync right now — status, actions with direct links, trust metric. */
export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })
  const locale = /^[a-z]{2}(-[A-Z]{2})?$/.test(request.nextUrl.searchParams.get('locale') ?? '')
    ? request.nextUrl.searchParams.get('locale')!
    : 'pt-BR'
  try {
    const health = await loadSyncHealth(await createAdminClient(), auth.organizationId, locale)
    return NextResponse.json({ ...health, checked_at: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível verificar a sincronização. Nova tentativa em instantes.' }, { status: 503 })
  }
}
