import {
  PLAN_LIMITS,
  PLAN_DISPLAY,
  getPlanLimits,
  getPlanFromPriceId,
  getPriceIdForPlan,
} from '@/lib/billing/plans'

describe('Billing Plans System', () => {
  describe('PLAN_LIMITS constants', () => {
    test('should have all required plans', () => {
      expect(PLAN_LIMITS).toHaveProperty('essencial')
      expect(PLAN_LIMITS).toHaveProperty('expansao')
      expect(PLAN_LIMITS).toHaveProperty('premium')
      expect(PLAN_LIMITS).toHaveProperty('enterprise')
    })

    describe('Property limits - Current Strategy (2026)', () => {
      test('Essencial: 1 included, extras available', () => {
        const limits = PLAN_LIMITS.essencial
        expect(limits.maxProperties).toBe(1)
        expect(limits.maxAllowed).toBeNull()
        expect(limits.extraPropertyPrice).toBe(49)
      })

      test('Expansão: 3 included, extras available', () => {
        const limits = PLAN_LIMITS.expansao
        expect(limits.maxProperties).toBe(3)
        expect(limits.maxAllowed).toBeNull()
        expect(limits.extraPropertyPrice).toBe(49)
      })

      test('Premium: até 10 propriedades e 5 utilizadores, sem extras pagos', () => {
        const limits = PLAN_LIMITS.premium
        expect(limits.maxProperties).toBe(10)
        expect(limits.maxUsers).toBe(5)
        expect(limits.maxAllowed).toBeNull()
        expect(limits.extraPropertyPrice).toBe(0)
      })

      test('Enterprise: até 20 propriedades, utilizadores ilimitados', () => {
        const limits = PLAN_LIMITS.enterprise
        expect(limits.maxProperties).toBe(20)
        expect(limits.maxUsers).toBeNull()
        expect(limits.maxAllowed).toBeNull()
        expect(limits.extraPropertyPrice).toBe(0)
      })
    })

    describe('Feature flags by plan', () => {
      test('Essencial: no premium features', () => {
        const limits = PLAN_LIMITS.essencial
        expect(limits.ownerReports).toBe(false)
        expect(limits.fiscalCompliance).toBe(false)
      })

      test('Expansão: has owner reports and fiscal compliance', () => {
        const limits = PLAN_LIMITS.expansao
        expect(limits.ownerReports).toBe(true)
        expect(limits.fiscalCompliance).toBe(true)
      })

      test('Premium: has all features', () => {
        const limits = PLAN_LIMITS.premium
        expect(limits.ownerReports).toBe(true)
        expect(limits.fiscalCompliance).toBe(true)
      })

      test('Enterprise: has all features', () => {
        const limits = PLAN_LIMITS.enterprise
        expect(limits.ownerReports).toBe(true)
        expect(limits.fiscalCompliance).toBe(true)
      })
    })

    describe('Legacy plan aliases (backward compatibility)', () => {
      test('getPlanLimits handles legacy names correctly', () => {
        expect(getPlanLimits('growth')).toEqual(PLAN_LIMITS.expansao)
        expect(getPlanLimits('professional')).toEqual(PLAN_LIMITS.premium)
        expect(getPlanLimits('business')).toEqual(PLAN_LIMITS.premium)
        expect(getPlanLimits('pro')).toEqual(PLAN_LIMITS.premium)
      })
    })

    describe('Extra property pricing consistency', () => {
      test('essencial and expansao charge R$49 per extra property', () => {
        expect(PLAN_LIMITS.essencial.extraPropertyPrice).toBe(49)
        expect(PLAN_LIMITS.expansao.extraPropertyPrice).toBe(49)
      })

      test('premium and enterprise do not sell extra properties (0 cost)', () => {
        expect(PLAN_LIMITS.premium.extraPropertyPrice).toBe(0)
        expect(PLAN_LIMITS.enterprise.extraPropertyPrice).toBe(0)
      })
    })
  })

  describe('PLAN_DISPLAY constants', () => {
    test('should have all current plans', () => {
      expect(PLAN_DISPLAY).toHaveLength(5)
      const ids = PLAN_DISPLAY.map((p) => p.id)
      expect(ids).toContain('essencial')
      expect(ids).toContain('expansao')
      expect(ids).toContain('premium')
      expect(ids).toContain('enterprise')
      expect(ids).toContain('development')
    })

    describe('Essencial plan display', () => {
      const plan = PLAN_DISPLAY.find((p) => p.id === 'essencial')!

      test('should have correct display info', () => {
        expect(plan.name).toBe('Essencial')
        expect(plan.price).toBe(59)
        expect(plan.highlighted).toBe(false)
        expect(plan.enterprise).toBe(false)
      })

      test('should mention 1 included property + extras', () => {
        expect(plan.properties).toContain('1')
        expect(plan.properties).toContain('+R$49')
      })

      test('should list basic features only', () => {
        expect(plan.features.length).toBeGreaterThan(0)
        expect(plan.features[0]).toContain('Motor de Reserva')
      })
    })

    describe('Expansão plan display', () => {
      const plan = PLAN_DISPLAY.find((p) => p.id === 'expansao')!

      test('should be highlighted', () => {
        expect(plan.highlighted).toBe(true)
      })

      test('should have correct price', () => {
        expect(plan.price).toBe(149)
      })

      test('should mention 3 included properties', () => {
        expect(plan.properties).toContain('3')
      })
    })

    describe('Premium plan display', () => {
      const plan = PLAN_DISPLAY.find((p) => p.id === 'premium')!

      test('should have correct price', () => {
        expect(plan.price).toBe(397)
      })

      test('should mention the 10-property limit', () => {
        expect(plan.properties).toBe('Até 10 unidades')
      })

      test('should list only features that exist', () => {
        expect(plan.features.some((f) => f.includes('API'))).toBe(false)
        expect(plan.features.some((f) => f.includes('BI'))).toBe(false)
        expect(plan.features).toContain('Até 10 unidades')
      })
    })

    describe('Enterprise plan display', () => {
      const plan = PLAN_DISPLAY.find((p) => p.id === 'enterprise')!

      test('should be marked as enterprise', () => {
        expect(plan.enterprise).toBe(true)
      })

      test('should have price 0', () => {
        expect(plan.price).toBe(0)
      })

      test('should mention the 20-property limit', () => {
        expect(plan.properties).toBe('Até 20 unidades')
      })
    })
  })

  describe('getPlanLimits function', () => {
    test('should return limits for valid plan', () => {
      const limits = getPlanLimits('essencial')
      expect(limits.maxProperties).toBe(1)
      expect(limits.maxAllowed).toBeNull()
    })

    test('should handle null plan (defaults to starter/essencial)', () => {
      const limits = getPlanLimits(null)
      expect(limits).toEqual(PLAN_LIMITS.essencial)
    })

    test('should handle undefined plan (defaults to starter/essencial)', () => {
      const limits = getPlanLimits(undefined as unknown as string)
      expect(limits).toEqual(PLAN_LIMITS.essencial)
    })

    test('should handle unknown plan (defaults to starter/essencial)', () => {
      const limits = getPlanLimits('unknown-plan')
      expect(limits).toEqual(PLAN_LIMITS.essencial)
    })

    test('should work with legacy aliases', () => {
      expect(getPlanLimits('growth')).toEqual(PLAN_LIMITS.expansao)
      expect(getPlanLimits('professional')).toEqual(PLAN_LIMITS.premium)
      expect(getPlanLimits('business')).toEqual(PLAN_LIMITS.premium)
    })
  })

  describe('User Limits by Plan (Phase 2 AC5-AC7)', () => {
    test('AC5: essencial plan allows 1 user', () => {
      const limits = getPlanLimits('essencial')
      expect(limits.maxUsers).toBe(1)
    })

    test('AC6: expansao plan allows 5 users', () => {
      const limits = getPlanLimits('expansao')
      expect(limits.maxUsers).toBe(5)
    })

    test('AC7: premium plan allows 5 users', () => {
      const limits = getPlanLimits('premium')
      expect(limits.maxUsers).toBe(5)
    })

    test('enterprise plan allows unlimited users', () => {
      const limits = getPlanLimits('enterprise')
      expect(limits.maxUsers).toBeNull()
    })
  })

  describe('getPlanFromPriceId function', () => {
    beforeEach(() => {
      // Set up environment variables for testing
      process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL = 'price_essencial_brl_test'
      process.env.STRIPE_PRICE_ID_EXPANSAO_BRL = 'price_expansao_brl_test'
      process.env.STRIPE_PRICE_ID_PREMIUM_BRL = 'price_premium_brl_test'
      process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR = 'price_essencial_eur_test'
      process.env.STRIPE_PRICE_ID_PRO_BRL = 'price_pro_brl_test'
    })

    afterEach(() => {
      delete process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL
      delete process.env.STRIPE_PRICE_ID_EXPANSAO_BRL
      delete process.env.STRIPE_PRICE_ID_PREMIUM_BRL
      delete process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR
      delete process.env.STRIPE_PRICE_ID_PRO_BRL
    })

    test('should map BRL price IDs correctly', () => {
      expect(getPlanFromPriceId('price_essencial_brl_test')).toBe('essencial')
      expect(getPlanFromPriceId('price_expansao_brl_test')).toBe('expansao')
      expect(getPlanFromPriceId('price_premium_brl_test')).toBe('premium')
    })

    test('should map EUR price IDs correctly', () => {
      expect(getPlanFromPriceId('price_essencial_eur_test')).toBe('essencial')
    })

    test('should map legacy pro to premium', () => {
      expect(getPlanFromPriceId('price_pro_brl_test')).toBe('premium')
    })

    test('should default to essencial for unknown price ID', () => {
      expect(getPlanFromPriceId('unknown_price_id')).toBe('essencial')
    })
  })

  describe('getPriceIdForPlan function', () => {
    beforeEach(() => {
      process.env.STRIPE_PRICE_ID_ESSENCIAL_BRL = 'price_essencial_brl'
      process.env.STRIPE_PRICE_ID_ESSENCIAL_EUR = 'price_essencial_eur'
      process.env.STRIPE_PRICE_ID_ESSENCIAL_USD = 'price_essencial_usd'
      process.env.STRIPE_PRICE_ID_EXPANSAO_BRL = 'price_expansao_brl'
      process.env.STRIPE_PRICE_ID_EXPANSAO_EUR = 'price_expansao_eur'
      process.env.STRIPE_PRICE_ID_PREMIUM_BRL = 'price_premium_brl'
      process.env.STRIPE_PRICE_ID_PREMIUM_EUR = 'price_premium_eur'
    })

    afterEach(() => {
      Object.keys(process.env).forEach((key) => {
        if (key.startsWith('STRIPE_PRICE_ID_')) {
          delete process.env[key]
        }
      })
    })

    test('should return BRL price ID for essencial plan', () => {
      expect(getPriceIdForPlan('essencial', 'brl')).toBe('price_essencial_brl')
    })

    test('should return EUR price ID for essencial plan', () => {
      expect(getPriceIdForPlan('essencial', 'eur')).toBe('price_essencial_eur')
    })

    test('should return USD price ID for essencial plan', () => {
      expect(getPriceIdForPlan('essencial', 'usd')).toBe('price_essencial_usd')
    })

    test('should return correct prices for each plan', () => {
      expect(getPriceIdForPlan('expansao', 'brl')).toBe('price_expansao_brl')
      expect(getPriceIdForPlan('premium', 'eur')).toBe('price_premium_eur')
    })

    test('should fallback to EUR if currency not found', () => {
      expect(getPriceIdForPlan('essencial', 'brl')).toBe('price_essencial_brl')
    })

    test('should return empty string for undefined price IDs', () => {
      // Enterprise has no Stripe prices
      expect(getPriceIdForPlan('enterprise', 'brl')).toBe('')
    })
  })
})

describe('PLAN_DISPLAY — anúncios só do que existe', () => {
  const { PLAN_DISPLAY } = require('@/lib/billing/plans')
  const premium = PLAN_DISPLAY.find((p: { id: string }) => p.id === 'premium')
  const enterprise = PLAN_DISPLAY.find((p: { id: string }) => p.id === 'enterprise')

  it('Premium não anuncia API completa nem Previsão/BI, e mostra o limite de 10', () => {
    const text = [premium.description, premium.properties, ...premium.features].join(' ')
    expect(text).not.toMatch(/API completa|BI avançado|Previsão|ilimitad/i)
    expect(premium.properties).toBe('Até 10 unidades')
  })

  it('Enterprise mostra o limite de 20', () => {
    expect(enterprise.properties).toBe('Até 20 unidades')
  })
})
