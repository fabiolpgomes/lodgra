import {
  PAID_PLANS,
  PLAN_DISPLAY,
  PLAN_LIMITS,
  PLAN_PRICES,
  currencyForLocale,
  getBasePriceId,
  getExtraPropertyPriceId,
  getPlanFromPriceId,
  getPlanLimits,
  getPlanPrice,
  isExtraPropertyPriceId,
  normalizePlan,
  toBillingCurrency,
} from '@/lib/billing/plans'

describe('Tabela de lançamento 2026', () => {
  it('propriedades incluídas: 1 / 3 / 10 / 20', () => {
    expect(PLAN_LIMITS.essencial.maxProperties).toBe(1)
    expect(PLAN_LIMITS.expansao.maxProperties).toBe(3)
    expect(PLAN_LIMITS.premium.maxProperties).toBe(10)
    expect(PLAN_LIMITS.enterprise.maxProperties).toBe(20)
  })

  it('nenhum plano pago é ilimitado em propriedades', () => {
    for (const plan of PAID_PLANS) expect(PLAN_LIMITS[plan].maxProperties).not.toBeNull()
  })

  it('utilizadores: Premium 5, Enterprise ilimitado', () => {
    expect(PLAN_LIMITS.premium.maxUsers).toBe(5)
    expect(PLAN_LIMITS.enterprise.maxUsers).toBeNull()
  })

  it('preços BRL: 29 / 49 / 99 / 149, extra 15 (8 no Enterprise)', () => {
    expect(PAID_PLANS.map(p => PLAN_PRICES[p].brl.monthly)).toEqual([29, 49, 99, 149])
    expect(PAID_PLANS.map(p => PLAN_PRICES[p].brl.extraProperty)).toEqual([15, 15, 15, 8])
  })

  it('preços EUR: 19 / 39 / 89 / 149, extra 12 (6 no Enterprise)', () => {
    expect(PAID_PLANS.map(p => PLAN_PRICES[p].eur.monthly)).toEqual([19, 39, 89, 149])
    expect(PAID_PLANS.map(p => PLAN_PRICES[p].eur.extraProperty)).toEqual([12, 12, 12, 6])
  })

  // Regra de produto: com as propriedades incluídas no plano seguinte, subir de plano
  // tem de ser mais barato do que ficar no plano atual pagando extras.
  it.each(['brl', 'eur'] as const)('subir de plano compensa em %s', currency => {
    for (let i = 0; i < PAID_PLANS.length - 1; i++) {
      const current = PAID_PLANS[i]
      const next = PAID_PLANS[i + 1]
      const needed = PLAN_LIMITS[next].maxProperties!
      const extras = needed - PLAN_LIMITS[current].maxProperties!
      const stay = PLAN_PRICES[current][currency].monthly + extras * PLAN_PRICES[current][currency].extraProperty
      expect(PLAN_PRICES[next][currency].monthly).toBeLessThan(stay)
    }
  })
})

describe('PLAN_DISPLAY', () => {
  it('tem os 4 planos pagos, na ordem', () => {
    expect(PLAN_DISPLAY.map(p => p.id)).toEqual(PAID_PLANS)
  })

  it('não anuncia recursos inexistentes nem propriedades ilimitadas', () => {
    const text = PLAN_DISPLAY.flatMap(p => [p.description, ...p.features]).join(' ')
    expect(text).not.toMatch(/API completa|BI avançado|Previsão|propriedades ilimitadas|unidades ilimitadas/i)
  })
})

describe('normalizePlan / getPlanLimits', () => {
  it('mapeia nomes antigos', () => {
    expect(normalizePlan('starter')).toBe('essencial')
    expect(normalizePlan('growth')).toBe('expansao')
    expect(normalizePlan('professional')).toBe('premium')
    expect(normalizePlan('pro')).toBe('premium')
  })

  it('desconhecido ou vazio → essencial', () => {
    expect(normalizePlan(null)).toBe('essencial')
    expect(normalizePlan('xyz')).toBe('essencial')
    expect(getPlanLimits('xyz')).toEqual(PLAN_LIMITS.essencial)
  })

  it('development não tem preço (sem extras)', () => {
    expect(getPlanPrice('development', 'brl')).toBeNull()
    expect(getPlanPrice('premium', 'eur')).toEqual({ monthly: 89, extraProperty: 12 })
  })
})

describe('moeda', () => {
  it('pt-BR paga em BRL; demais em EUR', () => {
    expect(currencyForLocale('pt-BR')).toBe('brl')
    expect(currencyForLocale('en-US')).toBe('eur')
    expect(currencyForLocale('es')).toBe('eur')
  })

  it('toBillingCurrency aceita EUR em qualquer caixa; resto é BRL', () => {
    expect(toBillingCurrency('EUR')).toBe('eur')
    expect(toBillingCurrency('eur')).toBe('eur')
    expect(toBillingCurrency(null)).toBe('brl')
  })
})

describe('IDs de preço Stripe', () => {
  const env = process.env
  beforeEach(() => {
    process.env = {
      ...env,
      STRIPE_PRICE_ID_PREMIUM_BRL: 'price_premium_brl',
      STRIPE_PRICE_ID_ENTERPRISE_EUR: 'price_ent_eur',
      STRIPE_PRICE_ID_EXTRA_PROPERTY_BRL: 'price_extra_brl',
      STRIPE_PRICE_ID_ENTERPRISE_EXTRA_PROPERTY_EUR: 'price_ent_extra_eur',
    }
  })
  afterAll(() => { process.env = env })

  it('preço base por plano e moeda', () => {
    expect(getBasePriceId('premium', 'brl')).toBe('price_premium_brl')
    expect(getBasePriceId('premium', 'eur')).toBeNull()
  })

  it('extra do Enterprise usa preço próprio', () => {
    expect(getExtraPropertyPriceId('essencial', 'brl')).toBe('price_extra_brl')
    expect(getExtraPropertyPriceId('enterprise', 'eur')).toBe('price_ent_extra_eur')
  })

  it('identifica plano e item de extra pelo preço', () => {
    expect(getPlanFromPriceId('price_ent_eur')).toBe('enterprise')
    expect(getPlanFromPriceId('price_desconhecido')).toBeNull()
    expect(isExtraPropertyPriceId('price_extra_brl')).toBe(true)
    expect(isExtraPropertyPriceId('price_premium_brl')).toBe(false)
  })
})
