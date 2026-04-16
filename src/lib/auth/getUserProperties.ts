import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Retorna os IDs das propriedades do utilizador autenticado.
 * - Admin ou access_all_properties = true → retorna null (sem filtro)
 * - Utilizador normal → retorna array de property_id
 *
 * Usa admin client para bypass RLS (auth.uid() não está disponível em server context)
 */
export async function getUserPropertyIds(
  supabase: SupabaseClient
): Promise<string[] | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return []

  // Use admin client to bypass RLS (auth.uid() not available in server context)
  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role, access_all_properties')
    .eq('id', user.id)
    .single()

  // Admin ou acesso total → sem filtro
  if (profile?.role === 'admin' || profile?.access_all_properties === true) {
    return null
  }

  // Buscar propriedades atribuídas ao utilizador (use admin client)
  const { data: userProperties } = await adminClient
    .from('user_properties')
    .select('property_id')
    .eq('user_id', user.id)

  return userProperties?.map(up => up.property_id) || []
}
