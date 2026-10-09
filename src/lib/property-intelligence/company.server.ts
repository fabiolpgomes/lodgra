import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

import { normalizeReportCompany, type ReportCompany } from './company'

type PublicProfileRow = {
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp_number?: string | null
  website_url?: string | null
}

/**
 * Lê o nome da organização e o perfil público (Dados da empresa) do tenant.
 * Sempre a partir do organizationId da sessão — nunca do payload do cliente.
 */
export async function getTenantReportCompany(organizationId: string): Promise<ReportCompany> {
  const admin = createAdminClient()
  const [{ data: organization }, { data: profile }] = await Promise.all([
    admin.from('organizations').select('name').eq('id', organizationId).maybeSingle(),
    admin
      .from('organization_public_profile')
      .select('contact_email, contact_phone, whatsapp_number, website_url')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ])

  const row = (profile ?? null) as PublicProfileRow | null

  return normalizeReportCompany({
    name: (organization as { name?: string | null } | null)?.name ?? null,
    websiteUrl: row?.website_url ?? null,
    email: row?.contact_email ?? null,
    phone: row?.contact_phone ?? null,
    whatsappNumber: row?.whatsapp_number ?? null,
  })
}
