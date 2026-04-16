import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedProfile, setCachedProfile } from '@/lib/cache/profileCache'

type Role = 'admin' | 'gestor' | 'viewer' | 'guest'

interface AuthResult {
  authorized: boolean
  userId?: string
  role?: Role
  accessAllProperties?: boolean
  organizationId?: string
  guestType?: 'staff' | 'owner'
  response?: NextResponse
}

/**
 * Verifica autenticação e role do utilizador server-side.
 * Retorna 401 se não autenticado, 403 se role insuficiente.
 *
 * Fluxo optimizado (3 níveis de custo decrescente):
 *
 *   Cache HIT:  getSession() [local, ~0ms] + Redis   [~1ms]  ≈ 1ms
 *   Cache MISS: getSession() [local, ~0ms] + RPC DB  [~15ms] ≈ 15ms
 *   vs. antes:  getUser()   [HTTP,  ~50ms] + DB query[~5ms]  ≈ 55ms
 *
 * getSession() não revalida com o servidor de Auth — a validação JWT
 * ocorre a nível Postgres no rpc('get_my_profile') nos cache misses,
 * e o middleware já faz getUser() em cada page request (token refresh).
 * Roles alterados invalidam o cache imediatamente via invalidateCachedProfile().
 */
export async function requireRole(minimumRoles: Role[]): Promise<AuthResult> {
  const supabase = await createClient()

  // 1. Decode local do JWT (sem HTTP) — obtém userId para lookup no cache
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  const userId = session.user.id

  let userRole: Role
  let accessAllProperties: boolean
  let organizationId: string | undefined
  let guestType: 'staff' | 'owner' | undefined

  // 2. Cache Redis — evita qualquer round trip à DB
  const cached = await getCachedProfile(userId)

  if (cached) {
    userRole = (cached.role as Role) || 'viewer'
    accessAllProperties = cached.access_all_properties
    organizationId = cached.organization_id ?? undefined
    guestType = cached.guest_type as 'staff' | 'owner' | undefined
  } else {
    // 3. Cache miss: RPC autentica a nível Postgres E lê perfil numa só call
    //    auth.uid() retorna NULL se JWT inválido → 0 linhas → perfil null
    type MyProfile = { user_id: string; role: string; access_all_properties: boolean; organization_id: string | null; guest_type: string | null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.rpc('get_my_profile') as any).maybeSingle() as { data: MyProfile | null }

    if (!profile?.user_id) {
      return {
        authorized: false,
        response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      }
    }

    userRole = ((profile.role as Role) || 'viewer') as Role
    accessAllProperties = profile.access_all_properties === true
    organizationId = (profile.organization_id as string | null) ?? undefined
    guestType = (profile.guest_type as 'staff' | 'owner' | null) ?? undefined

    await setCachedProfile(userId, {
      role: userRole,
      access_all_properties: accessAllProperties,
      organization_id: organizationId ?? null,
      guest_type: guestType ?? null,
    })
  }

  if (!minimumRoles.includes(userRole)) {
    return {
      authorized: false,
      userId,
      role: userRole,
      accessAllProperties,
      organizationId,
      guestType,
      response: NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 }),
    }
  }

  return {
    authorized: true,
    userId,
    role: userRole,
    accessAllProperties,
    organizationId,
    guestType,
  }
}
