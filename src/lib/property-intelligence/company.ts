/**
 * Identidade da empresa (tenant) mostrada no cabeçalho do relatório de inteligência.
 * Todos os campos são opcionais: o que o tenant não preencheu não aparece no relatório.
 */
export interface ReportCompany {
  name?: string | null
  websiteUrl?: string | null
  email?: string | null
  phone?: string | null
  whatsappNumber?: string | null
}

/** Texto de uma linha só, sem espaços a mais; vazio vira null. */
export function cleanCompanyField(value: string | null | undefined): string | null {
  const cleaned = (value ?? '').replace(/\s+/g, ' ').trim()
  return cleaned || null
}

export function normalizeReportCompany(company?: ReportCompany | null): ReportCompany {
  return {
    name: cleanCompanyField(company?.name),
    websiteUrl: cleanCompanyField(company?.websiteUrl),
    email: cleanCompanyField(company?.email),
    phone: cleanCompanyField(company?.phone),
    whatsappNumber: cleanCompanyField(company?.whatsappNumber),
  }
}
