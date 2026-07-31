export type Plan = 'essencial' | 'expansao' | 'premium' | 'enterprise' | 'development'

export interface PlanLimits {
  maxProperties: number | null // null = unlimited
  maxAllowed: number | null // Maximum properties allowed on this plan (ceiling, can add extras)
  extraPropertyPrice: number // Cost per extra property (R$ in BRL)
  maxUsers: number | null // null = unlimited
  ownerReports: boolean
  fiscalCompliance: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // Brasil strategy (2026) — pricing with property limits & extras
  essencial:    { maxProperties: 1,  maxAllowed: null, extraPropertyPrice: 49, maxUsers: 1, ownerReports: false, fiscalCompliance: false },
  expansao:     { maxProperties: 3,  maxAllowed: null, extraPropertyPrice: 49, maxUsers: 5, ownerReports: true,  fiscalCompliance: true  },
  premium:      { maxProperties: 10, maxAllowed: null, extraPropertyPrice: 49, maxUsers: 10, ownerReports: true,  fiscalCompliance: true  },
  enterprise:   { maxProperties: null, maxAllowed: null, extraPropertyPrice: 0, maxUsers: null, ownerReports: true,  fiscalCompliance: true  },
  // Development/Testing labs
  development:  { maxProperties: 99, maxAllowed: null, extraPropertyPrice: 0, maxUsers: null, ownerReports: true,  fiscalCompliance: true  },
}

export function getPlanLimits(plan: string | null): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) ?? 'essencial'] ?? PLAN_LIMITS.essencial
}

export function getPlanFromPriceId(priceId: string): Plan {
  const map: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR    ?? '']: 'essencial',
    [process.env.STRIPE_PRICE_ID_EXPANSAO_EUR     ?? '']: 'expansao',
    [process.env.STRIPE_PRICE_ID_PREMIUM_EUR      ?? '']: 'premium',
    [process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL   ?? '']: 'essencial',
    [process.env.STRIPE_PRICE_ID_EXPANSAO_BRL    ?? '']: 'expansao',
    [process.env.STRIPE_PRICE_ID_PREMIUM_BRL     ?? '']: 'premium',
    [process.env.STRIPE_PRICE_ID_ESSENCIAL_USD   ?? '']: 'essencial',
    [process.env.STRIPE_PRICE_ID_EXPANSAO_USD    ?? '']: 'expansao',
    [process.env.STRIPE_PRICE_ID_PREMIUM_USD     ?? '']: 'premium',
  }
  return map[priceId] ?? 'essencial'
}

export function getPriceIdForPlan(plan: Plan, currency: 'eur' | 'brl' | 'usd'): string {
  const ids: Record<Plan, Record<string, string | undefined>> = {
    essencial:   { eur: process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR,    brl: process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL,    usd: process.env.STRIPE_PRICE_ID_ESSENCIAL_USD },
    expansao:    { eur: process.env.STRIPE_PRICE_ID_EXPANSAO_EUR,     brl: process.env.STRIPE_PRICE_ID_EXPANSAO_BRL,     usd: process.env.STRIPE_PRICE_ID_EXPANSAO_USD },
    premium:     { eur: process.env.STRIPE_PRICE_ID_PREMIUM_EUR,      brl: process.env.STRIPE_PRICE_ID_PREMIUM_BRL,      usd: process.env.STRIPE_PRICE_ID_PREMIUM_USD },
    enterprise:  { eur: undefined,                                      brl: undefined,                                     usd: undefined },
    development: { eur: undefined,                                      brl: undefined,                                     usd: undefined },
  }
  return ids[plan]?.[currency] ?? ids[plan]?.eur ?? ''
}

export interface PlanDisplay {
  id: string
  name: string
  highlighted: boolean
  enterprise: boolean
  // legacy fields — used by billing components until Stripe implementation is updated
  price: number
  description: string
  properties: string
  features: string[]
}

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    id: 'essencial', name: 'Essencial', highlighted: false, enterprise: false,
    price: 59, description: 'Saia da planilha. Controle uma unidade com lucro claro.', properties: '1 unidade incluída (+R$49 por unidade extra)',
    features: ['Motor de Reserva Direta', 'Sync iCal', 'Calendário unificado', 'Gestão básica de reservas'],
  },
  {
    id: 'expansao', name: 'Expansão', highlighted: true, enterprise: false,
    price: 149, description: 'Coordene sem caos. Até 3 unidades e automações de limpeza.', properties: '3 unidades incluídas (+R$49 por unidade extra)',
    features: ['Tudo do Essencial', 'Portal de Limpadores (WhatsApp)', 'Relatórios por Proprietário', 'Equipe até 5 pessoas'],
  },
  {
    id: 'premium', name: 'Premium', highlighted: false, enterprise: false,
    price: 397, description: 'Automatize operação e receita. Inteligência para grandes portfólios.', properties: '10 unidades incluídas (+R$49 por unidade extra)',
    features: ['Tudo do Expansão', 'API Completa', 'Forecast & BI Avançado', 'Gerente Dedicado', 'Unidades extras sob demanda'],
  },
  {
    id: 'enterprise', name: 'Enterprise', highlighted: false, enterprise: true,
    price: 0, description: 'Para grandes operações com requisitos customizados', properties: 'Volume personalizado',
    features: ['Tudo do Premium', 'Onboarding dedicado', 'SLA garantido', 'Contrato customizado'],
  },
  {
    id: 'development', name: 'Development', highlighted: false, enterprise: false,
    price: 0, description: 'Laboratório de testes para desenvolvimento', properties: '99 unidades (ambiente de teste)',
    features: ['Completo', 'Sem limites para testes', 'Ambiente isolado', 'Documentação completa'],
  },
]
