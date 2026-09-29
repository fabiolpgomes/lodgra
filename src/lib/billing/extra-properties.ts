import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStripe } from '@/lib/stripe/platform'
import {
  type BillingCurrency,
  type Plan,
  getExtraPropertyPriceId,
  getPlanLimits,
  getPlanPrice,
  isExtraPropertyPriceId,
  isPaidPlan,
  normalizePlan,
  toBillingCurrency,
} from './plans'

// 'trial' é como o webhook grava o status 'trialing' do Stripe
const ACTIVE_SUBSCRIPTION = ['active', 'trial', 'trialing', 'past_due']

export interface PropertyCapacity {
  plan: Plan
  included: number | null
  extraCount: number
  activeCount: number
  /** incluídas + extras já contratadas (null = sem limite) */
  allowed: number | null
  currency: BillingCurrency
  /** preço mensal de uma propriedade adicional; null = plano não vende extras */
  extraPrice: number | null
  subscriptionId: string | null
  subscriptionActive: boolean
}

export type AddPropertyCheck =
  | { ok: true; charged: false }
  | { ok: true; charged: true; extraPrice: number; currency: BillingCurrency }
  | { ok: false; code: 'extra_property_confirmation_required'; extraPrice: number; currency: BillingCurrency; included: number }
  | { ok: false; code: 'subscription_required' | 'property_limit_reached' | 'billing_error'; message: string }

export async function getPropertyCapacity(orgId: string): Promise<PropertyCapacity | null> {
  const admin = createAdminClient()
  const { data: org } = await admin
    .from('organizations')
    .select('subscription_plan, plan, extra_properties_count, billing_currency, stripe_subscription_id, subscription_status')
    .eq('id', orgId)
    .single()
  if (!org) return null

  const { count } = await admin
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  const plan = normalizePlan(org.subscription_plan ?? org.plan)
  const included = getPlanLimits(plan).maxProperties
  const extraCount = Number(org.extra_properties_count ?? 0)
  const currency = toBillingCurrency(org.billing_currency)
  const price = getPlanPrice(plan, currency)

  return {
    plan,
    included,
    extraCount,
    activeCount: count ?? 0,
    allowed: included === null ? null : included + extraCount,
    currency,
    extraPrice: price?.extraProperty ?? null,
    subscriptionId: org.stripe_subscription_id ?? null,
    subscriptionActive: !!org.stripe_subscription_id && ACTIVE_SUBSCRIPTION.includes(org.subscription_status ?? ''),
  }
}

/**
 * Chamar ANTES de inserir uma propriedade. Se ela exceder o incluído no plano:
 * - sem confirmação → pede confirmação com o preço;
 * - com confirmação → acrescenta 1 extra na assinatura Stripe e no banco,
 *   para que o trigger check_property_limit aceite o INSERT.
 * Se o INSERT falhar depois, chamar reconcileExtraProperties(orgId).
 */
export async function prepareAddProperty(orgId: string, confirmExtra: boolean): Promise<AddPropertyCheck> {
  const cap = await getPropertyCapacity(orgId)
  if (!cap) return { ok: false, code: 'billing_error', message: 'Organização não encontrada' }
  if (cap.allowed === null || cap.activeCount < cap.allowed) return { ok: true, charged: false }

  if (cap.extraPrice === null) {
    return { ok: false, code: 'property_limit_reached', message: `O plano atual permite ${cap.allowed} propriedades.` }
  }
  if (!confirmExtra) {
    return {
      ok: false,
      code: 'extra_property_confirmation_required',
      extraPrice: cap.extraPrice,
      currency: cap.currency,
      included: cap.included ?? 0,
    }
  }
  if (!cap.subscriptionActive || !cap.subscriptionId) {
    return { ok: false, code: 'subscription_required', message: 'Ative uma assinatura para adicionar propriedades além das incluídas no plano.' }
  }

  const result = await setExtraProperties(orgId, cap, cap.activeCount + 1 - (cap.included ?? 0))
  if (!result.ok) return { ok: false, code: 'billing_error', message: result.message }
  return { ok: true, charged: true, extraPrice: cap.extraPrice, currency: cap.currency }
}

/** Ajusta extras = max(0, propriedades ativas − incluídas). Usar após excluir propriedade, trocar de plano ou nova assinatura. */
export async function reconcileExtraProperties(orgId: string): Promise<{ ok: boolean; extras?: number; message?: string }> {
  const cap = await getPropertyCapacity(orgId)
  if (!cap) return { ok: false, message: 'Organização não encontrada' }
  const target = cap.included === null ? 0 : Math.max(0, cap.activeCount - cap.included)
  return setExtraProperties(orgId, cap, target)
}

async function setExtraProperties(
  orgId: string,
  cap: PropertyCapacity,
  target: number
): Promise<{ ok: boolean; extras?: number; message?: string }> {
  const admin = createAdminClient()

  if (cap.subscriptionId && isPaidPlan(cap.plan)) {
    try {
      const stripe = getPlatformStripe(cap.currency)
      const sub = await stripe.subscriptions.retrieve(cap.subscriptionId)
      const currency = toBillingCurrency(sub.currency)
      const wantedPrice = getExtraPropertyPriceId(cap.plan, currency)
      const extraItems = sub.items.data.filter(i => isExtraPropertyPriceId((i.price as Stripe.Price).id))
      const current = extraItems.find(i => (i.price as Stripe.Price).id === wantedPrice)
      const items: Stripe.SubscriptionUpdateParams.Item[] = []

      // Remove itens de extra com preço de outro plano (ex.: após mudar para Enterprise)
      for (const item of extraItems) {
        if (item !== current || target === 0) items.push({ id: item.id, deleted: true })
      }
      if (target > 0) {
        if (!wantedPrice) return { ok: false, message: `Preço de propriedade adicional (${currency.toUpperCase()}) não configurado.` }
        if (current) {
          if (current.quantity !== target) items.push({ id: current.id, quantity: target })
        } else {
          items.push({ price: wantedPrice, quantity: target })
        }
      }
      if (items.length > 0) {
        await stripe.subscriptions.update(cap.subscriptionId, { items, proration_behavior: 'create_prorations' })
      }
    } catch (err) {
      console.error('[extra-properties] falha ao atualizar assinatura', { orgId, err: err instanceof Error ? err.message : err })
      return { ok: false, message: 'Não foi possível atualizar a assinatura. Tente novamente.' }
    }
  }

  if (target !== cap.extraCount) {
    const { error } = await admin
      .from('organizations')
      .update({ extra_properties_count: target, updated_at: new Date().toISOString() })
      .eq('id', orgId)
    if (error) return { ok: false, message: 'Não foi possível registar as propriedades adicionais.' }
  }
  return { ok: true, extras: target }
}

/** Corpo e status HTTP para quando prepareAddProperty não autoriza o cadastro. */
export function addPropertyRejection(check: Exclude<AddPropertyCheck, { ok: true }>): { status: number; body: Record<string, unknown> } {
  switch (check.code) {
    case 'extra_property_confirmation_required':
      return {
        status: 402,
        body: { error: check.code, extraPrice: check.extraPrice, currency: check.currency, included: check.included },
      }
    case 'subscription_required':
      return { status: 402, body: { error: check.code, message: check.message } }
    case 'property_limit_reached':
      return { status: 403, body: { error: check.code, message: check.message } }
    default:
      return { status: 502, body: { error: check.code, message: check.message } }
  }
}
