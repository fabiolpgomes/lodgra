import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export type Role = 'admin' | 'gestor' | 'viewer'

/**
 * Retorna o role do utilizador autenticado (server-side).
 * Usa admin client para bypass RLS (auth.uid() não está disponível em server context)
 */
export async function getUserRole(supabase: SupabaseClient): Promise<Role> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'viewer'

  // Use admin client to bypass RLS
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile?.role as Role) || 'viewer'
}
