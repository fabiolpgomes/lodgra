import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCachedProfile, setCachedProfile } from '@/lib/cache/profileCache'
import { UserRole } from '@/lib/auth/role-types'

type Role = 'admin' | 'gestor' | 'owner' | 'viewer' | 'guest'

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
 * getUser() valida o JWT com o servidor de Auth em cada request,
 * garantindo que tokens revogados são rejeitados imediatamente.
 * Roles e perfil são cached no Redis para minimizar round trips à DB.
 * Roles alterados invalidam o cache imediatamente via invalidateCachedProfile().
 */
export async function requireRole(minimumRoles: Role[]): Promise<AuthResult> {
  const supabase = await createClient()

  // Valida JWT com o servidor de Auth (rejeita tokens revogados)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    }
  }

  const userId = user.id

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
