import { formatCurrency } from '@/lib/utils/currency'

export type Plan = 'essencial' | 'expansao' | 'premium' | 'enterprise' | 'development'
export type PaidPlan = Exclude<Plan, 'development'>
export type BillingCurrency = 'brl' | 'eur'

export interface PlanLimits {
  maxProperties: number | null // propriedades incluídas no preço base (null = sem limite)
  maxUsers: number | null // null = sem limite
  ownerReports: boolean
  fiscalCompliance: boolean
}

// Espelha a função check_property_limit() no banco — alterar os dois juntos.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  essencial:   { maxProperties: 1,  maxUsers: 1,    ownerReports: false, fiscalCompliance: false },
  expansao:    { maxProperties: 3,  maxUsers: 5,    ownerReports: true,  fiscalCompliance: true  },
  premium:     { maxProperties: 10, maxUsers: 5,    ownerReports: true,  fiscalCompliance: true  },
  enterprise:  { maxProperties: 20, maxUsers: null, ownerReports: true,  fiscalCompliance: true  },
  // Laboratório de desenvolvimento/testes — sem cobrança, sem extras
  development: { maxProperties: 99, maxUsers: null, ownerReports: true,  fiscalCompliance: true  },
}

export interface PlanPrice {
  monthly: number // preço base mensal
  extraProperty: number // por propriedade acima das incluídas, por mês
}

// Preços de lançamento (2026). Cada valor tem um preço correspondente no Stripe
// (ver getBasePriceId / getExtraPropertyPriceId).
export const PLAN_PRICES: Record<PaidPlan, Record<BillingCurrency, PlanPrice>> = {
  essencial:  { brl: { monthly: 29,  extraProperty: 15 }, eur: { monthly: 19,  extraProperty: 12 } },
  expansao:   { brl: { monthly: 49,  extraProperty: 15 }, eur: { monthly: 39,  extraProperty: 12 } },
  premium:    { brl: { monthly: 99,  extraProperty: 15 }, eur: { monthly: 89,  extraProperty: 12 } },
  enterprise: { brl: { monthly: 149, extraProperty: 8  }, eur: { monthly: 149, extraProperty: 6  } },
}

export const PAID_PLANS: PaidPlan[] = ['essencial', 'expansao', 'premium', 'enterprise']

const LEGACY_PLAN_MAP: Record<string, Plan> = {
  starter: 'essencial',
  growth: 'expansao',
  professional: 'premium',
  business: 'premium',
  pro: 'premium',
}

export function normalizePlan(plan: string | null | undefined): Plan {
  if (!plan) return 'essencial'
  if (LEGACY_PLAN_MAP[plan]) return LEGACY_PLAN_MAP[plan]
  return plan in PLAN_LIMITS ? (plan as Plan) : 'essencial'
}

export function isPaidPlan(plan: string): plan is PaidPlan {
  return (PAID_PLANS as string[]).includes(plan)
}

export function getPlanLimits(plan: string | null): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)]
}

export function getPlanPrice(plan: string | null, currency: BillingCurrency): PlanPrice | null {
  const p = normalizePlan(plan)
  return isPaidPlan(p) ? PLAN_PRICES[p][currency] : null
}

/** pt-BR paga em Real; os demais mercados (Europa) em Euro */
export function currencyForLocale(locale: string | null | undefined): BillingCurrency {
  return locale === 'pt-BR' ? 'brl' : 'eur'
}

export function toBillingCurrency(value: string | null | undefined): BillingCurrency {
  return (value ?? '').toLowerCase() === 'eur' ? 'eur' : 'brl'
}

// ── IDs de preço no Stripe ────────────────────────────────────────────────
// STRIPE_PRICE_ID_<PLANO>_<MOEDA>                      preço base do plano
// STRIPE_PRICE_ID_EXTRA_PROPERTY_<MOEDA>               extra (Essencial/Expansão/Premium)
// STRIPE_PRICE_ID_ENTERPRISE_EXTRA_PROPERTY_<MOEDA>    extra do Enterprise

function env(key: string): string | null {
  return (process.env[key] ?? '').trim() || null
}

export function getBasePriceId(plan: PaidPlan, currency: BillingCurrency): string | null {
  return env(`STRIPE_PRICE_ID_${plan.toUpperCase()}_${currency.toUpperCase()}`)
}

export function getExtraPropertyPriceId(plan: PaidPlan, currency: BillingCurrency): string | null {
  const prefix = plan === 'enterprise' ? 'ENTERPRISE_EXTRA_PROPERTY' : 'EXTRA_PROPERTY'
  return env(`STRIPE_PRICE_ID_${prefix}_${currency.toUpperCase()}`)
}

export function getPlanFromPriceId(priceId: string): Plan | null {
  for (const plan of PAID_PLANS) {
    for (const currency of ['brl', 'eur'] as BillingCurrency[]) {
      if (getBasePriceId(plan, currency) === priceId) return plan
    }
  }
  return null
}

export function isExtraPropertyPriceId(priceId: string): boolean {
  return PAID_PLANS.some(plan =>
    (['brl', 'eur'] as BillingCurrency[]).some(c => getExtraPropertyPriceId(plan, c) === priceId)
  )
}

// ── Apresentação ─────────────────────────────────────────────────────────
export interface PlanDisplay {
  id: PaidPlan
  name: string
  highlighted: boolean
  description: string
  features: string[]
}

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    id: 'essencial', name: 'Essencial', highlighted: false,
    description: 'Saia da folha de cálculo. Controle uma unidade com lucro claro.',
    features: ['1 unidade incluída', 'Motor de Reserva Direta', 'Sincronização iCal', 'Calendário unificado', 'Gestão básica de reservas'],
  },
  {
    id: 'expansao', name: 'Expansão', highlighted: true,
    description: 'Coordene sem caos. Até 3 unidades e automações de limpeza.',
    features: ['3 unidades incluídas', 'Tudo do Essencial', 'Portal de Colaboradores (WhatsApp)', 'Relatórios por proprietário', 'Equipa até 5 pessoas'],
  },
  {
    id: 'premium', name: 'Premium', highlighted: false,
    description: 'Automatize operações e receita. Até 10 unidades.',
    features: ['10 unidades incluídas', 'Tudo do Expansão', 'Gestor dedicado', 'Equipa até 5 pessoas'],
  },
  {
    id: 'enterprise', name: 'Enterprise', highlighted: false,
    description: 'Para operações maiores. Até 20 unidades e equipa ilimitada.',
    features: ['20 unidades incluídas', 'Tudo do Premium', 'Onboarding dedicado', 'Equipa ilimitada'],
  },
]

export function includedPropertiesLabel(plan: PaidPlan): string {
  const n = PLAN_LIMITS[plan].maxProperties ?? 0
  return n === 1 ? '1 unidade incluída' : `${n} unidades incluídas`
}

/** "R$ 15,00" / "12,00 €" */
export function formatPlanPrice(amount: number, currency: BillingCurrency): string {
  return formatCurrency(amount, currency === 'eur' ? 'EUR' : 'BRL')
}
