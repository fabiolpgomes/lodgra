export type Plan = 'essencial' | 'expansao' | 'premium' | 'enterprise' | 'starter' | 'professional' | 'business' | 'growth' | 'pro'

export interface PlanLimits {
  maxProperties: number | null // null = unlimited
  ownerReports: boolean
  fiscalCompliance: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // Current: Brasil strategy (2026)
  essencial:    { maxProperties: null, ownerReports: false, fiscalCompliance: false },
  expansao:     { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  premium:      { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  enterprise:   { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  // Legacy aliases (backward compatibility)
  starter:      { maxProperties: null, ownerReports: false, fiscalCompliance: false },
  growth:       { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  professional: { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  business:     { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  pro:          { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
}

export function getPlanLimits(plan: string | null): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) ?? 'starter'] ?? PLAN_LIMITS.starter
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
    // legacy
    [process.env.STRIPE_PRICE_ID_PRO_EUR          ?? '']: 'premium',
    [process.env.STRIPE_PRICE_ID_PRO_BRL          ?? '']: 'premium',
    [process.env.STRIPE_PRICE_ID_PRO_USD          ?? '']: 'premium',
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR ?? '']: 'professional',
    [process.env.STRIPE_PRICE_ID_BUSINESS_EUR     ?? '']: 'business',
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL_BRL ?? '']: 'professional',
    [process.env.STRIPE_PRICE_ID_BUSINESS_BRL     ?? '']: 'business',
  }
  return map[priceId] ?? 'essencial'
}

export function getPriceIdForPlan(plan: Plan, currency: 'eur' | 'brl' | 'usd'): string {
  const ids: Record<Plan, Record<string, string | undefined>> = {
    // Current: Brasil strategy (2026)
    essencial:    { eur: process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR,    brl: process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL,    usd: process.env.STRIPE_PRICE_ID_ESSENCIAL_USD },
    expansao:     { eur: process.env.STRIPE_PRICE_ID_EXPANSAO_EUR,     brl: process.env.STRIPE_PRICE_ID_EXPANSAO_BRL,     usd: process.env.STRIPE_PRICE_ID_EXPANSAO_USD },
    premium:      { eur: process.env.STRIPE_PRICE_ID_PREMIUM_EUR,      brl: process.env.STRIPE_PRICE_ID_PREMIUM_BRL,      usd: process.env.STRIPE_PRICE_ID_PREMIUM_USD },
    enterprise:   { eur: undefined,                                      brl: undefined,                                     usd: undefined },
    // Legacy aliases (backward compatibility)
    starter:      { eur: process.env.STRIPE_PRICE_ID_STARTER_EUR,      brl: process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL,    usd: process.env.STRIPE_PRICE_ID_STARTER_USD },
    growth:       { eur: process.env.STRIPE_PRICE_ID_GROWTH_EUR,       brl: process.env.STRIPE_PRICE_ID_EXPANSAO_BRL,     usd: process.env.STRIPE_PRICE_ID_GROWTH_USD },
    professional: { eur: process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR, brl: process.env.STRIPE_PRICE_ID_PREMIUM_BRL,      usd: undefined },
    business:     { eur: process.env.STRIPE_PRICE_ID_BUSINESS_EUR,     brl: process.env.STRIPE_PRICE_ID_PREMIUM_BRL,      usd: undefined },
    pro:          { eur: process.env.STRIPE_PRICE_ID_PREMIUM_EUR,      brl: process.env.STRIPE_PRICE_ID_PREMIUM_BRL,      usd: process.env.STRIPE_PRICE_ID_PREMIUM_USD },
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
    price: 59, description: 'Ideal para iniciar a profissionalização com reservas diretas e iCal.', properties: 'A partir de 1 unidade',
    features: ['Motor de Reserva Direta', 'Sync iCal', 'Calendário unificado', 'Gestão básica de reservas'],
  },
  {
    id: 'expansao', name: 'Expansão', highlighted: true, enterprise: false,
    price: 89, description: 'Desbloqueie relatórios financeiros, P&L e automações avançadas.', properties: 'A partir de 1 unidade',
    features: ['Tudo do Essencial', 'Relatórios Financeiros', 'Split de Pagamentos', 'Gestão Operacional (Limpeza)'],
  },
  {
    id: 'premium', name: 'Premium', highlighted: false, enterprise: false,
    price: 130, description: 'Inteligência para grandes portfólios e gestão de múltiplos proprietários.', properties: 'A partir de 1 unidade',
    features: ['Tudo do Expansão', 'Portal do Proprietário', 'Pricing Dinâmico', 'Suporte Prioritário VIP'],
  },
  {
    id: 'enterprise', name: 'Enterprise', highlighted: false, enterprise: true,
    price: 0, description: 'Para grandes operações com requisitos customizados', properties: 'Volume personalizado',
    features: ['Tudo do Premium', 'Onboarding dedicado', 'SLA garantido', 'API completa incl. Airbnb'],
  },
]
