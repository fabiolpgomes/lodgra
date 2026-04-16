export type Plan = 'starter' | 'professional' | 'business'

export interface PlanLimits {
  maxProperties: number | null // null = unlimited
  ownerReports: boolean
  fiscalCompliance: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter:      { maxProperties: 3,    ownerReports: false, fiscalCompliance: false },
  professional: { maxProperties: 10,   ownerReports: true,  fiscalCompliance: true  },
  business:     { maxProperties: null, ownerReports: true,  fiscalCompliance: true  },
}

export function getPlanLimits(plan: string | null): PlanLimits {
  return PLAN_LIMITS[(plan as Plan) ?? 'starter'] ?? PLAN_LIMITS.starter
}

export function getPlanFromPriceId(priceId: string): Plan {
  const map: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_ID_STARTER_EUR ?? '']:      'starter',
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL_EUR ?? '']: 'professional',
    [process.env.STRIPE_PRICE_ID_BUSINESS_EUR ?? '']:     'business',
  }
  return map[priceId] ?? 'starter'
}

export const PLAN_DISPLAY = [
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    description: 'Para gestores que estão a começar',
    properties: 'Até 3 propriedades',
    features: ['Calendário drag-drop', 'Reservas manuais', 'Sync iCal', 'Relatórios básicos'],
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 49,
    description: 'Para gestores em crescimento',
    properties: 'Até 10 propriedades',
    features: ['Tudo do Starter', 'Relatórios por proprietário', 'Compliance Fiscal PT (IRS)', 'Exportar PDF/Excel'],
    highlighted: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    description: 'Para operações profissionais',
    properties: 'Propriedades ilimitadas',
    features: ['Tudo do Professional', 'Suporte prioritário', '2FA (em breve)', 'API access (em breve)'],
    highlighted: false,
  },
]
