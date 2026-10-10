import { NextRequest, NextResponse } from 'next/server'
import { recordPlatformAudit, requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Margem para não apagar quem está a meio do registo (auth criado, perfil ainda não). */
export const ORPHAN_GRACE_MS = 60 * 60 * 1000

interface OrphanedUser {
  id: string
  email: string
}

/**
 * POST /api/platform/orphaned-users?action=list|delete
 *
 * Operação de plataforma (global por natureza: compara auth.users com
 * user_profiles de TODAS as organizações), por isso só o operador acede.
 * Utilizadores criados há menos de ORPHAN_GRACE_MS nunca são considerados órfãos.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin()
  if (!auth.authorized) return auth.response

  const action = request.nextUrl.searchParams.get('action') || 'list'
  if (action !== 'list' && action !== 'delete') {
    return NextResponse.json({ error: 'action deve ser "list" ou "delete"' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  try {
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })
    if (authError) {
      return NextResponse.json({ error: 'Falha ao listar utilizadores de autenticação' }, { status: 500 })
    }

    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id')
    if (profileError) {
      return NextResponse.json({ error: 'Falha ao listar perfis' }, { status: 500 })
    }

    const profileIds = new Set((profiles ?? []).map(p => p.id))
    const cutoff = Date.now() - ORPHAN_GRACE_MS
    const orphaned: OrphanedUser[] = (authData?.users ?? [])
      .filter(u => !profileIds.has(u.id) && new Date(u.created_at).getTime() < cutoff)
      .map(u => ({ id: u.id, email: u.email || 'unknown' }))

    if (action === 'list') {
      return NextResponse.json({ orphaned_count: orphaned.length, orphaned_users: orphaned })
    }

    if (orphaned.length === 0) {
      return NextResponse.json({ deleted_count: 0, deleted_users: [] })
    }

    // Auditoria primeiro: sem registo, nada é apagado.
    const audited = await recordPlatformAudit({
      actorUserId: auth.userId,
      action: 'orphaned_users.delete',
      target: 'auth.users',
      metadata: { candidates: orphaned.map(u => u.id) },
    })
    if (!audited) {
      return NextResponse.json({ error: 'Não foi possível registar a auditoria' }, { status: 503 })
    }

    const deleted: OrphanedUser[] = []
    const errors: { id: string; error: string }[] = []
    for (const user of orphaned) {
      try {
        const { error } = await adminClient.auth.admin.deleteUser(user.id)
        if (error) errors.push({ id: user.id, error: error.message })
        else deleted.push(user)
      } catch (err) {
        errors.push({ id: user.id, error: err instanceof Error ? err.message : 'Erro desconhecido' })
      }
    }

    return NextResponse.json({
      deleted_count: deleted.length,
      deleted_users: deleted,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[platform/orphaned-users] erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
