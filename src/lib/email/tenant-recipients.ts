import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Para onde vão os avisos de um tenant (ex.: nova reserva direta): o e-mail de contacto
 * da empresa (Dados da empresa) e os administradores da organização. Sem duplicados.
 */
export async function getTenantNotificationEmails(organizationId: string): Promise<string[]> {
  const admin = createAdminClient()
  const [{ data: profile }, { data: admins }] = await Promise.all([
    admin.from('organization_public_profile').select('contact_email').eq('organization_id', organizationId).maybeSingle(),
    admin.from('user_profiles').select('email').eq('organization_id', organizationId).eq('role', 'admin'),
  ])

  const candidates = [profile?.contact_email, ...(admins ?? []).map((a: { email: string | null }) => a.email)]
  const seen = new Set<string>()
  for (const raw of candidates) {
    const email = (raw ?? '').trim().toLowerCase()
    if (email && EMAIL_RE.test(email)) seen.add(email)
  }
  return [...seen]
}

/** E-mail de contacto público do tenant (reply-to dos e-mails aos hóspedes). */
export async function getTenantContactEmail(organizationId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('organization_public_profile')
    .select('contact_email')
    .eq('organization_id', organizationId)
    .maybeSingle()
  const email = (data?.contact_email ?? '').trim()
  return EMAIL_RE.test(email) ? email : null
}
