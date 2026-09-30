import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BillingCurrency } from '@/lib/billing/plans'
import { getPlatformStripe, isPlatformStripeConfigured } from './platform'

// Stripe Connect para os tenants (reservas diretas).
// Cada organização tem uma conta conectada (Accounts v2) com a configuração `merchant`:
// o hóspede paga diretamente o tenant (cobranças diretas). Plano:
// docs/stripe/CONNECT-PAGAMENTOS-TENANTS.md

export type ConnectPlatform = BillingCurrency // 'brl' = Lodgra BR, 'eur' = Lodgra PT
export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted'

/** Países que cada plataforma aceita no cadastro. Brasil → Lodgra BR; Europa → Lodgra PT. */
export const CONNECT_COUNTRIES: Record<string, { label: string; platform: ConnectPlatform; currency: string; locale: string }> = {
  BR: { label: 'Brasil', platform: 'brl', currency: 'brl', locale: 'pt-BR' },
  PT: { label: 'Portugal', platform: 'eur', currency: 'eur', locale: 'pt-PT' },
  ES: { label: 'Espanha', platform: 'eur', currency: 'eur', locale: 'es-ES' },
  FR: { label: 'França', platform: 'eur', currency: 'eur', locale: 'fr-FR' },
  IT: { label: 'Itália', platform: 'eur', currency: 'eur', locale: 'it-IT' },
  DE: { label: 'Alemanha', platform: 'eur', currency: 'eur', locale: 'de-DE' },
  BE: { label: 'Bélgica', platform: 'eur', currency: 'eur', locale: 'fr-BE' },
  NL: { label: 'Países Baixos', platform: 'eur', currency: 'eur', locale: 'nl-NL' },
  IE: { label: 'Irlanda', platform: 'eur', currency: 'eur', locale: 'en-IE' },
}

export interface OrgConnect {
  accountId: string | null
  platform: ConnectPlatform | null
  status: ConnectStatus
}

type AnyCapability = { status?: string } | null | undefined

/** Traduz o estado das capacidades v2 para o estado do Lodgra. */
export function statusFromAccount(account: Stripe.V2.Core.Account): ConnectStatus {
  const merchant = account.configuration?.merchant as
    | { capabilities?: { card_payments?: AnyCapability; stripe_balance?: { payouts?: AnyCapability } } }
    | null
    | undefined
  const cardPayments = merchant?.capabilities?.card_payments?.status
  if (cardPayments === 'active') return 'active'
  // Conta nova, sem dados, vem 'restricted' até o cadastro terminar: tratar como pendente.
  // 'unsupported' = o Stripe não aceita pagamentos para esta conta.
  if (cardPayments === 'unsupported') return 'restricted'
  return 'pending'
}

export async function getOrgConnect(orgId: string): Promise<OrgConnect | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('organizations')
    .select('stripe_connect_account_id, stripe_connect_platform, stripe_connect_status')
    .eq('id', orgId)
    .single()
  if (!data) return null
  return {
    accountId: data.stripe_connect_account_id ?? null,
    platform: (data.stripe_connect_platform as ConnectPlatform | null) ?? null,
    status: (data.stripe_connect_status as ConnectStatus) ?? 'none',
  }
}

/** Cria a conta conectada do tenant (se ainda não existir) na plataforma do país. */
export async function ensureConnectedAccount(
  orgId: string,
  input: { country: string; email: string; displayName: string }
): Promise<OrgConnect> {
  const current = await getOrgConnect(orgId)
  if (!current) throw new Error('organization_not_found')
  if (current.accountId && current.platform) return current

  const country = CONNECT_COUNTRIES[input.country.toUpperCase()]
  if (!country) throw new Error('country_not_supported')
  if (!isPlatformStripeConfigured(country.platform)) throw new Error('platform_not_configured')

  const stripe = getPlatformStripe(country.platform)
  const account = await stripe.v2.core.accounts.create(
    {
      display_name: input.displayName,
      contact_email: input.email,
      identity: { country: input.country.toLowerCase() },
      dashboard: 'full',
      defaults: {
        currency: country.currency,
        locales: [country.locale as Stripe.V2.Core.AccountCreateParams.Defaults.Locale],
        responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
      },
      configuration: {
        merchant: { capabilities: { card_payments: { requested: true } } },
      },
      metadata: { lodgra_organization_id: orgId },
      include: ['configuration.merchant'],
    },
    // Evita duas contas se o botão for clicado duas vezes
    { idempotencyKey: `lodgra-connect-${orgId}` }
  )

  const status = statusFromAccount(account)
  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_platform: country.platform,
      stripe_connect_status: status,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
  if (error) throw new Error('organization_update_failed')

  return { accountId: account.id, platform: country.platform, status }
}

/**
 * Estado a partir da conta v1 (mesma conta, lida pela API v1), que diz se o cadastro
 * foi enviado e se o Stripe ainda pede dados:
 * - charges_enabled → active
 * - cadastro enviado mas o Stripe pede dados/correções → restricted (ação necessária)
 * - caso contrário → pending (por concluir, ou concluído e em análise)
 */
export function onboardingFromAccount(account: Stripe.Account): { status: ConnectStatus; detailsSubmitted: boolean } {
  const detailsSubmitted = !!account.details_submitted
  if (account.charges_enabled) return { status: 'active', detailsSubmitted }
  const req = account.requirements
  const needsInfo =
    (req?.currently_due?.length ?? 0) > 0 || (req?.past_due?.length ?? 0) > 0 || (req?.errors?.length ?? 0) > 0
  if (detailsSubmitted && needsInfo) return { status: 'restricted', detailsSubmitted }
  return { status: 'pending', detailsSubmitted }
}

export type OrgConnectState = OrgConnect & { detailsSubmitted: boolean }

/** Consulta o Stripe e grava o estado atual da conta do tenant. */
export async function refreshConnectStatus(orgId: string): Promise<OrgConnectState | null> {
  const current = await getOrgConnect(orgId)
  if (!current) return null
  if (!current.accountId || !current.platform) return { ...current, detailsSubmitted: false }

  const account = await getPlatformStripe(current.platform).accounts.retrieve(current.accountId)
  const { status, detailsSubmitted } = onboardingFromAccount(account)
  if (status !== current.status) {
    await createAdminClient()
      .from('organizations')
      .update({ stripe_connect_status: status, stripe_connect_updated_at: new Date().toISOString() })
      .eq('id', orgId)
  }
  return { ...current, status, detailsSubmitted }
}

/** Sessão para os componentes embutidos do Stripe (cadastro, pagamentos, repasses). */
export async function createConnectAccountSession(connect: OrgConnect): Promise<string> {
  if (!connect.accountId || !connect.platform) throw new Error('no_connected_account')
  const session = await getPlatformStripe(connect.platform).accountSessions.create({
    account: connect.accountId,
    components: {
      account_onboarding: { enabled: true },
      account_management: { enabled: true },
      notification_banner: { enabled: true },
      payments: { enabled: true, features: { refund_management: true, dispute_management: true, capture_payments: true } },
      payouts: { enabled: true },
    },
  })
  return session.client_secret
}

// ── Reservas diretas ─────────────────────────────────────────────────────────

/**
 * TRANSITÓRIO: a AHS ainda cobra com a chave da sua própria conta Stripe
 * (STRIPE_PT_SECRET_KEY). Quando a AHS concluir o cadastro em "Pagamentos online",
 * a conta conectada passa a ter prioridade; depois remover isto e o client-pt.
 */
const LEGACY_BOOKING_ORG_SLUG = 'algarve-home-stay'

export type BookingPaymentAccount =
  | { kind: 'connect'; stripe: Stripe; accountId: string; platform: ConnectPlatform }
  | { kind: 'legacy'; stripe: Stripe }

/** Conta onde a reserva direta de uma organização deve ser cobrada; null = sem pagamento online. */
export async function resolveBookingPaymentAccount(orgId: string): Promise<BookingPaymentAccount | null> {
  let connect = await getOrgConnect(orgId)
  if (connect?.accountId && connect.platform && connect.status !== 'active') {
    // O cadastro pode ter sido concluído há pouco: confirma no Stripe
    connect = await refreshConnectStatus(orgId).catch(() => connect)
  }
  if (connect?.accountId && connect.platform && connect.status === 'active') {
    return {
      kind: 'connect',
      stripe: getPlatformStripe(connect.platform),
      accountId: connect.accountId,
      platform: connect.platform,
    }
  }

  const legacyKey = (process.env.STRIPE_PT_SECRET_KEY ?? '').trim()
  if (legacyKey) {
    const { data: org } = await createAdminClient().from('organizations').select('slug').eq('id', orgId).single()
    if (org?.slug === LEGACY_BOOKING_ORG_SLUG) {
      const { getStripePT } = await import('./client-pt')
      return { kind: 'legacy', stripe: getStripePT() }
    }
  }
  return null
}

/** Cliente e opções para operar sobre um pagamento já feito (reembolso, consulta). */
export async function stripeForReservationPayment(reservation: {
  stripe_account_id?: string | null
  stripe_connect_platform?: string | null
}): Promise<{ stripe: Stripe; options?: Stripe.RequestOptions }> {
  if (reservation.stripe_account_id && reservation.stripe_connect_platform) {
    return {
      stripe: getPlatformStripe(reservation.stripe_connect_platform as ConnectPlatform),
      options: { stripeAccount: reservation.stripe_account_id },
    }
  }
  const { getStripePT } = await import('./client-pt')
  return { stripe: getStripePT() }
}
