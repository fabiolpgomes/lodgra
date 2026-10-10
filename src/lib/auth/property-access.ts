import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Confirma que a propriedade pertence à organização indicada.
 *
 * Necessário sempre que uma rota recebe um propertyId do cliente e depois usa
 * serviços com service_role (que ignoram RLS). Falha fechada: qualquer erro → false.
 */
export async function propertyBelongsToOrg(
  propertyId: unknown,
  organizationId: string | null | undefined
): Promise<boolean> {
  if (typeof propertyId !== 'string' || !propertyId || !organizationId) return false
  try {
    const { data, error } = await createAdminClient()
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .maybeSingle()
    return !error && !!data
  } catch {
    return false
  }
}
