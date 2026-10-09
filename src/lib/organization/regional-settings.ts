/**
 * Fuso horário e moeda de uma organização (organizations.timezone / organizations.currency).
 * O fuso define "hoje" e "este mês" em dashboards, relatórios, crons e vigência de repasses.
 * A lista é fechada nos mercados atendidos (BR, PT, ES) e nunca aceita texto livre do cliente.
 */

export const ORGANIZATION_CURRENCIES = ['EUR', 'BRL'] as const
export type OrganizationCurrency = (typeof ORGANIZATION_CURRENCIES)[number]

export const ORGANIZATION_TIME_ZONES = [
  { value: 'Europe/Lisbon', label: 'Portugal continental (Lisboa)' },
  { value: 'Atlantic/Azores', label: 'Portugal – Açores' },
  { value: 'Atlantic/Madeira', label: 'Portugal – Madeira' },
  { value: 'Europe/Madrid', label: 'Espanha continental (Madrid)' },
  { value: 'Atlantic/Canary', label: 'Espanha – Canárias' },
  { value: 'America/Sao_Paulo', label: 'Brasil – Brasília (São Paulo)' },
  { value: 'America/Bahia', label: 'Brasil – Bahia' },
  { value: 'America/Fortaleza', label: 'Brasil – Fortaleza' },
  { value: 'America/Recife', label: 'Brasil – Recife' },
  { value: 'America/Belem', label: 'Brasil – Belém' },
  { value: 'America/Manaus', label: 'Brasil – Manaus' },
  { value: 'America/Cuiaba', label: 'Brasil – Cuiabá' },
  { value: 'America/Campo_Grande', label: 'Brasil – Campo Grande' },
  { value: 'America/Rio_Branco', label: 'Brasil – Rio Branco' },
  { value: 'America/Noronha', label: 'Brasil – Fernando de Noronha' },
] as const

const TIME_ZONE_VALUES: ReadonlySet<string> = new Set(ORGANIZATION_TIME_ZONES.map(zone => zone.value))

export function isOrganizationTimeZone(value: unknown): value is string {
  return typeof value === 'string' && TIME_ZONE_VALUES.has(value)
}

export function isOrganizationCurrency(value: unknown): value is OrganizationCurrency {
  return typeof value === 'string' && (ORGANIZATION_CURRENCIES as readonly string[]).includes(value)
}

/**
 * Ponto de partida de uma organização criada a partir do checkout, deduzido da moeda de cobrança.
 * É só o valor inicial: a organização pode ajustá-lo em Definições (ex.: Espanha usa EUR mas Europe/Madrid).
 */
export function regionalDefaultsForBillingCurrency(
  billingCurrency: string | null | undefined,
): { timezone: string; currency: OrganizationCurrency } {
  if (billingCurrency?.toLowerCase() === 'brl') {
    return { timezone: 'America/Sao_Paulo', currency: 'BRL' }
  }
  return { timezone: 'Europe/Lisbon', currency: 'EUR' }
}
