import { prepareAddProperty, reconcileExtraProperties, addPropertyRejection } from '../extra-properties'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStripe } from '@/lib/stripe/platform'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/stripe/platform')

type Org = {
  subscription_plan: string
  plan?: string | null
  extra_properties_count: number
  billing_currency: string | null
  stripe_subscription_id: string | null
  subscription_status: string
}

let org: Org
let activeProperties: number
let orgUpdates: Record<string, unknown>[]

function fakeAdmin() {
  return {
    from(table: string) {
      if (table === 'organizations') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: org }) }) }),
          update: (values: Record<string, unknown>) => ({
            eq: async () => {
              orgUpdates.push(values)
              return { error: null }
            },
          }),
        }
      }
      return { select: () => ({ eq: () => ({ is: async () => ({ count: activeProperties }) }) }) }
    },
  }
}

const stripe = {
  subscriptions: {
    retrieve: jest.fn(),
    update: jest.fn(),
  },
}

function subscription(items: { id: string; price: string; quantity?: number }[], currency = 'brl') {
  return { currency, items: { data: items.map(i => ({ id: i.id, quantity: i.quantity ?? 1, price: { id: i.price } })) } }
}

const ORIGINAL_ENV = process.env

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    STRIPE_PRICE_ID_ESSENCIAL_BRL: 'price_ess_brl',
    STRIPE_PRICE_ID_ENTERPRISE_BRL: 'price_ent_brl',
    STRIPE_PRICE_ID_EXTRA_PROPERTY_BRL: 'price_extra_brl',
    STRIPE_PRICE_ID_ENTERPRISE_EXTRA_PROPERTY_BRL: 'price_ent_extra_brl',
  }
  org = {
    subscription_plan: 'essencial',
    extra_properties_count: 0,
    billing_currency: 'brl',
    stripe_subscription_id: 'sub_1',
    subscription_status: 'active',
  }
  activeProperties = 0
  orgUpdates = []
  jest.clearAllMocks()
  ;(createAdminClient as jest.Mock).mockReturnValue(fakeAdmin())
  ;(getPlatformStripe as jest.Mock).mockReturnValue(stripe)
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

describe('prepareAddProperty', () => {
  it('dentro do incluído: autoriza sem cobrar', async () => {
    await expect(prepareAddProperty('org', false)).resolves.toEqual({ ok: true, charged: false })
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
  })

  it('no limite, sem confirmação: pede confirmação com o preço', async () => {
    activeProperties = 1
    const result = await prepareAddProperty('org', false)
    expect(result).toEqual({
      ok: false,
      code: 'extra_property_confirmation_required',
      extraPrice: 15,
      currency: 'brl',
      included: 1,
    })
    expect(addPropertyRejection(result as never).status).toBe(402)
  })

  it('confirmado: cria o item de extra no Stripe e grava a contagem', async () => {
    activeProperties = 1
    stripe.subscriptions.retrieve.mockResolvedValue(subscription([{ id: 'si_base', price: 'price_ess_brl' }]))

    const result = await prepareAddProperty('org', true)

    expect(result).toEqual({ ok: true, charged: true, extraPrice: 15, currency: 'brl' })
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ price: 'price_extra_brl', quantity: 1 }],
      proration_behavior: 'create_prorations',
    })
    expect(orgUpdates[0]).toMatchObject({ extra_properties_count: 1 })
  })

  it('confirmado com extras existentes: incrementa a quantidade', async () => {
    org.extra_properties_count = 2
    activeProperties = 3
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription([
        { id: 'si_base', price: 'price_ess_brl' },
        { id: 'si_extra', price: 'price_extra_brl', quantity: 2 },
      ])
    )

    await prepareAddProperty('org', true)

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_extra', quantity: 3 }],
      proration_behavior: 'create_prorations',
    })
    expect(orgUpdates[0]).toMatchObject({ extra_properties_count: 3 })
  })

  it('sem assinatura ativa: bloqueia', async () => {
    activeProperties = 1
    org.stripe_subscription_id = null
    const result = await prepareAddProperty('org', true)
    expect(result).toMatchObject({ ok: false, code: 'subscription_required' })
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
  })

  it('plano development não vende extras', async () => {
    org.subscription_plan = 'development'
    activeProperties = 99
    await expect(prepareAddProperty('org', true)).resolves.toMatchObject({ ok: false, code: 'property_limit_reached' })
  })

  it('falha no Stripe: não grava contagem', async () => {
    activeProperties = 1
    stripe.subscriptions.retrieve.mockRejectedValue(new Error('boom'))
    await expect(prepareAddProperty('org', true)).resolves.toMatchObject({ ok: false, code: 'billing_error' })
    expect(orgUpdates).toHaveLength(0)
  })
})

describe('reconcileExtraProperties', () => {
  it('após excluir: reduz a quantidade', async () => {
    org.extra_properties_count = 3
    activeProperties = 3 // 1 incluída + 2 extras
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription([
        { id: 'si_base', price: 'price_ess_brl' },
        { id: 'si_extra', price: 'price_extra_brl', quantity: 3 },
      ])
    )
    await expect(reconcileExtraProperties('org')).resolves.toEqual({ ok: true, extras: 2 })
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_extra', quantity: 2 }],
      proration_behavior: 'create_prorations',
    })
  })

  it('sem extras necessários: remove o item', async () => {
    org.extra_properties_count = 1
    activeProperties = 1
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription([
        { id: 'si_base', price: 'price_ess_brl' },
        { id: 'si_extra', price: 'price_extra_brl', quantity: 1 },
      ])
    )
    await reconcileExtraProperties('org')
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_extra', deleted: true }],
      proration_behavior: 'create_prorations',
    })
    expect(orgUpdates[0]).toMatchObject({ extra_properties_count: 0 })
  })

  it('mudou para Enterprise: troca o preço do extra', async () => {
    org.subscription_plan = 'enterprise'
    org.extra_properties_count = 2
    activeProperties = 22
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription([
        { id: 'si_base', price: 'price_ent_brl' },
        { id: 'si_extra', price: 'price_extra_brl', quantity: 21 },
      ])
    )
    await reconcileExtraProperties('org')
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      items: [{ id: 'si_extra', deleted: true }, { price: 'price_ent_extra_brl', quantity: 2 }],
      proration_behavior: 'create_prorations',
    })
  })

  it('já correto: não chama o Stripe para atualizar', async () => {
    org.extra_properties_count = 0
    activeProperties = 1
    stripe.subscriptions.retrieve.mockResolvedValue(subscription([{ id: 'si_base', price: 'price_ess_brl' }]))
    await reconcileExtraProperties('org')
    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
    expect(orgUpdates).toHaveLength(0)
  })
})
