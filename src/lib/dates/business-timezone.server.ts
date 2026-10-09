import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_BUSINESS_TIME_ZONE } from './date-only'

function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || !timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/** Fuso de negócio de uma organização (`organizations.timezone`), com o fuso por omissão se faltar ou for inválido. */
export async function getOrganizationTimeZone(
  organizationId: string | null | undefined,
  db: Pick<SupabaseClient, 'from'> = createAdminClient()
): Promise<string> {
  if (!organizationId) return DEFAULT_BUSINESS_TIME_ZONE
  const { data } = await db
    .from('organizations')
    .select('timezone')
    .eq('id', organizationId)
    .maybeSingle()
  return isValidTimeZone(data?.timezone) ? data.timezone : DEFAULT_BUSINESS_TIME_ZONE
}

/** Fuso de negócio da organização do utilizador autenticado na sessão `supabase`. */
export async function getSessionTimeZone(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_BUSINESS_TIME_ZONE
  const { data: profile } = await createAdminClient()
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()
  return getOrganizationTimeZone(profile?.organization_id as string | null | undefined)
}
