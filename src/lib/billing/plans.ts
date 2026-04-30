export type Plan = 'starter' | 'professional' | 'business' | 'growth' | 'pro' | 'enterprise'

export interface PlanLimits {
  maxProperties: number | null // null = unlimited
  ownerReports: boolean
  fiscalCompliance: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter:      { maxProperties: null, ownerReports: false, fiscalCompliance: false },
  growth:       { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  pro:          { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  enterprise:   { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  // legacy aliases
  professional: { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
  business:     { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
}

export function getPlanLimits(plan: string | null): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) ?? 'starter'] ?? PLAN_LIMITS.starter
}

export function getPlanFromPriceId(priceId: string): Plan {
  const map: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_ID_STARTER_EUR      ?? '']: 'starter',
    [process.env.STRIPE_PRICE_ID_GROWTH_EUR        ?? '']: 'growth',
    [process.env.STRIPE_PRICE_ID_PRO_EUR           ?? '']: 'pro',
    [process.env.STRIPE_PRICE_ID_STARTER_BRL      ?? '']: 'starter',
    [process.env.STRIPE_PRICE_ID_GROWTH_BRL        ?? '']: 'growth',
    [process.env.STRIPE_PRICE_ID_PRO_BRL           ?? '']: 'pro',
    [process.env.STRIPE_PRICE_ID_STARTER_USD      ?? '']: 'starter',
    [process.env.STRIPE_PRICE_ID_GROWTH_USD        ?? '']: 'growth',
    [process.env.STRIPE_PRICE_ID_PRO_USD           ?? '']: 'pro',
    // legacy
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR ?? '']: 'professional',
    [process.env.STRIPE_PRICE_ID_BUSINESS_EUR     ?? '']: 'business',
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL_BRL ?? '']: 'professional',
    [process.env.STRIPE_PRICE_ID_BUSINESS_BRL     ?? '']: 'business',
  }
  return map[priceId] ?? 'starter'
}

export function getPriceIdForPlan(plan: Plan, currency: 'eur' | 'brl' | 'usd'): string {
  const ids: Record<Plan, Record<string, string | undefined>> = {
    starter:      { eur: process.env.STRIPE_PRICE_ID_STARTER_EUR,      brl: process.env.STRIPE_PRICE_ID_STARTER_BRL,      usd: process.env.STRIPE_PRICE_ID_STARTER_USD },
    growth:       { eur: process.env.STRIPE_PRICE_ID_GROWTH_EUR,       brl: process.env.STRIPE_PRICE_ID_GROWTH_BRL,       usd: process.env.STRIPE_PRICE_ID_GROWTH_USD },
    pro:          { eur: process.env.STRIPE_PRICE_ID_PRO_EUR,          brl: process.env.STRIPE_PRICE_ID_PRO_BRL,          usd: process.env.STRIPE_PRICE_ID_PRO_USD },
    enterprise:   { eur: undefined,                                      brl: undefined,                                     usd: undefined },
    // legacy aliases
    professional: { eur: process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR, brl: process.env.STRIPE_PRICE_ID_PROFESSIONAL_BRL, usd: undefined },
    business:     { eur: process.env.STRIPE_PRICE_ID_BUSINESS_EUR,     brl: process.env.STRIPE_PRICE_ID_BUSINESS_BRL,     usd: undefined },
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
    id: 'starter', name: 'Starter', highlighted: false, enterprise: false,
    price: 9, description: 'Para gestores que estão a começar', properties: 'A partir de 1 unidade',
    features: ['Sync iCal', 'Calendário unificado', 'Gestão básica de reservas', 'Suporte standard'],
  },
  {
    id: 'growth', name: 'Growth', highlighted: true, enterprise: false,
    price: 14, description: 'Para gestores em crescimento', properties: 'A partir de 1 unidade',
    features: ['Integração API de canais', 'Dados completos de reservas', 'Automações', 'Relatórios financeiros', 'Sync em tempo real'],
  },
  {
    id: 'pro', name: 'Pro', highlighted: false, enterprise: false,
    price: 19, description: 'Para operações profissionais', properties: 'A partir de 1 unidade',
    features: ['Tudo do Growth', 'Pricing dinâmico', 'Automações avançadas', 'Insights de performance', 'Suporte prioritário'],
  },
  {
    id: 'enterprise', name: 'Enterprise', highlighted: false, enterprise: true,
    price: 0, description: 'Para grandes operações', properties: 'Volume personalizado',
    features: ['Tudo do Pro', 'Onboarding dedicado', 'SLA garantido', 'API completa incl. Airbnb'],
  },
]
