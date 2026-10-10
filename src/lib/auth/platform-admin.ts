import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Identidade de operador da plataforma Lodgra.
 *
 * Independente dos roles de organização: um admin de tenant NUNCA é platform admin.
 * A verificação é sempre feita no servidor, em cada pedido (sem cache), para que
 * remover uma linha de `platform_admins` revogue o acesso de imediato.
 */
export type PlatformAdminResolution =
  | { status: 'ok'; userId: string }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'error' }

export async function resolvePlatformAdmin(): Promise<PlatformAdminResolution> {
  const supabase = await createClient()

  // getUser() valida o JWT no servidor de Auth (rejeita tokens revogados)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { status: 'unauthenticated' }

  const { data, error } = await createAdminClient()
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // Falha fechada: se não der para confirmar, ninguém entra.
  if (error) {
    console.error('[platform-admin] falha ao consultar platform_admins:', error.message)
    return { status: 'error' }
  }

  return data ? { status: 'ok', userId: user.id } : { status: 'forbidden' }
}

type PlatformAuthResult =
  | { authorized: true; userId: string; response?: never }
  | { authorized: false; response: NextResponse }

/** Para route handlers: 401 sem sessão, 403 se não for platform admin, 503 se a consulta falhar. */
export async function requirePlatformAdmin(): Promise<PlatformAuthResult> {
  const resolution = await resolvePlatformAdmin()

  switch (resolution.status) {
    case 'ok':
      return { authorized: true, userId: resolution.userId }
    case 'unauthenticated':
      return { authorized: false, response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) }
    case 'forbidden':
      return { authorized: false, response: NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }) }
    case 'error':
      return { authorized: false, response: NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 }) }
  }
}

/**
 * Regista uma ação privilegiada do console. Chamar ANTES de executar a ação:
 * se o registo falhar devolve false e a ação não deve correr (falha fechada).
 * `metadata` nunca pode conter segredos.
 */
export async function recordPlatformAudit(entry: {
  actorUserId: string
  action: string
  target?: string
  metadata?: Record<string, unknown>
}): Promise<boolean> {
  const { error } = await createAdminClient().from('platform_audit_log').insert({
    actor_user_id: entry.actorUserId,
    action: entry.action,
    target: entry.target ?? null,
    metadata: entry.metadata ?? {},
  })

  if (error) {
    console.error('[platform-audit] falha ao gravar registo:', error.message)
    return false
  }
  return true
}
