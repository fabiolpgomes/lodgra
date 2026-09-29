import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimStripeEvent, markStripeEventProcessed, releaseStripeEvent } from '@/lib/stripe/webhook-idempotency'
import { invalidateCachedProfile } from '@/lib/cache/profileCache'
import { invalidateCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'
import { getPlanFromPriceId, isExtraPropertyPriceId, normalizePlan, toBillingCurrency } from '@/lib/billing/plans'
import { reconcileExtraProperties } from '@/lib/billing/extra-properties'
import type { BillingCurrency } from '@/lib/billing/plans'
import { configuredPlatformCurrencies, getPlatformStripe, getPlatformWebhookSecret } from '@/lib/stripe/platform'
import { UserRole } from '@/lib/auth/role-types'
import { createUserProfile } from '@/lib/auth/create-user-profile'

type AdminClient = ReturnType<typeof createAdminClient>

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  // O mesmo endpoint recebe eventos das duas contas da plataforma (BRL e EUR);
  // a assinatura válida identifica a conta de origem.
  const verified = verifyPlatformEvent(body, sig)
  if (!verified) {
    console.error('Webhook signature verification failed for all platform accounts')
    return NextResponse.json({ error: 'Webhook error: assinatura inválida' }, { status: 400 })
  }
  const { event, stripe } = verified

  const supabase = await createAdminClient()

  // Idempotência: o Stripe pode reenviar ou entregar o mesmo evento em paralelo.
  let claim
  try {
    claim = await claimStripeEvent(supabase, 'platform', event)
  } catch (err: unknown) {
    console.error('[webhook] Falha ao registrar evento', event.id, err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  if (claim === 'duplicate') {
    console.log(`[webhook] Evento ${event.id} já processado — ignorado`)
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claim === 'in_progress') {
    console.log(`[webhook] Evento ${event.id} em processamento por outra entrega`)
    return NextResponse.json({ error: 'Evento em processamento' }, { status: 409 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, stripe, session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(supabase, subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: deletedOrgs } = await supabase
          .from('organizations')
          .update({ subscription_status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)
          .select('id')
        if (deletedOrgs?.[0]?.id) await invalidateCachedSubscriptionStatus(deletedOrgs[0].id)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string | undefined
        if (subscriptionId) {
          const { data: failedOrgs } = await supabase
            .from('organizations')
            .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', subscriptionId)
            .select('id')
          if (failedOrgs?.[0]?.id) await invalidateCachedSubscriptionStatus(failedOrgs[0].id)
        }
        break
      }
      default:
        console.log(`Evento Stripe ignorado: ${event.type}`)
    }
  } catch (err: unknown) {
    console.error(`Erro ao processar evento ${event.type}:`, err)
    await releaseStripeEvent(supabase, event.id)
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }

  await markStripeEventProcessed(supabase, event.id)
  return NextResponse.json({ received: true })
}

function verifyPlatformEvent(body: string, sig: string): { event: Stripe.Event; stripe: Stripe; currency: BillingCurrency } | null {
  for (const currency of configuredPlatformCurrencies()) {
    const secret = getPlatformWebhookSecret(currency)
    if (!secret) continue
    const stripe = getPlatformStripe(currency)
    try {
      return { event: stripe.webhooks.constructEvent(body, sig, secret), stripe, currency }
    } catch {
      // assinatura de outra conta — tenta a próxima
    }
  }
  return null
}

async function handleCheckoutCompleted(supabase: AdminClient, stripe: Stripe, session: Stripe.Checkout.Session) {
  // Direct booking checkouts have reservation_id in metadata — skip, handled by booking-webhook
  if (session.metadata?.reservation_id) {
    console.log('[webhook] Checkout de reserva directa — ignorado neste handler')
    return
  }

  const email = session.customer_email || session.customer_details?.email
  if (!email) {
    console.error('Checkout completado sem email de cliente')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Plano: metadata do checkout; senão, o preço base da assinatura
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
  const baseItem = sub.items.data.find(item => !isExtraPropertyPriceId((item.price as Stripe.Price).id))
  const planFromPrice = baseItem ? getPlanFromPriceId((baseItem.price as Stripe.Price).id) : null
  const plan = session.metadata?.plan ? normalizePlan(session.metadata.plan) : (planFromPrice ?? 'essencial')

  const stripeOrgFields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active' as const,
    plan,
    subscription_plan: plan,
    stripe_subscription_item_id: baseItem?.id ?? null,
    billing_currency: toBillingCurrency(sub.currency),
  }

  // Check if user already exists WITH an organization before creating a new one.
  // This prevents overwriting an existing user's organization_id on re-subscription.
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id, organization_id')
    .eq('email', email)
    .maybeSingle()

  let org: { id: string } | null = null
  let userId: string | undefined

  // Guarda extra de idempotência: se esta assinatura já tem organização (ex.: entrega
  // anterior criou a org e falhou depois), reutiliza em vez de criar uma segunda.
  const { data: orgForSubscription } = subscriptionId
    ? await supabase.from('organizations').select('id').eq('stripe_subscription_id', subscriptionId).maybeSingle()
    : { data: null }

  if (existingProfile?.organization_id) {
    // Existing user with org — update Stripe billing data on their org, never create a new one
    userId = existingProfile.id
    const { data: updatedOrg, error: updateErr } = await supabase
      .from('organizations')
      .update(stripeOrgFields)
      .eq('id', existingProfile.organization_id)
      .select('id')
      .single()

    if (updateErr) {
      console.error('[webhook] Erro ao actualizar org existente:', updateErr)
      return
    }
    org = updatedOrg
    console.log(`[webhook] Org existente actualizada: ${email} → org ${org?.id}`)
  } else {
    // No org for this user — reuse the subscription's org or create a new one
    const slug = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 40)
      + '-' + Date.now().toString(36)

    if (orgForSubscription) {
      org = orgForSubscription
      console.log(`[webhook] Assinatura ${subscriptionId} já tem org ${org.id} — reutilizada`)
    } else {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: email.split('@')[0],
          slug,
          ...stripeOrgFields,
        })
        .select('id')
        .single()

      if (orgError || !newOrg) {
        console.error('[webhook] Erro ao criar organização:', orgError)
        return
      }
      org = newOrg
    }

    if (existingProfile?.id) {
      // User exists in auth but has no org — link without sending invite
      userId = existingProfile.id
    } else {
      // Completely new user — send invite email
      // redirectTo aponta directamente para a página cliente de definição de password.
      // O Supabase usa o fluxo antigo (não-PKCE) e devolve a sessão no fragmento
      // (#access_token=xxx). O Route Handler do servidor nunca vê fragmentos, por isso
      // enviamos o utilizador directamente para a página React que consegue detectá-los
      // via supabase.auth.getSession() (detectSessionInUrl: true por defeito).
      const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
      const appUrl = rawAppUrl.replace(/\/(pt-BR|pt|en-US|es)$/, '')
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: { organization_id: org.id },
          redirectTo: `${appUrl}/auth/reset-password-confirm?from=invite`,
        }
      )
      if (inviteError) {
        if (inviteError.message?.toLowerCase().includes('already been registered')) {
          console.warn(`[webhook] ${email} existe em auth.users sem user_profile — será associado no próximo login`)
        } else {
          console.error('[webhook] Erro ao convidar utilizador:', inviteError)
        }
      } else {
        userId = inviteData?.user?.id
        if (userId) {
          await supabase.auth.admin.updateUserById(userId, { email_confirm: true })
        }
      }
    }
  }

  // Organização existente pode já ter mais propriedades que o plano inclui
  if (org?.id) {
    const reconciled = await reconcileExtraProperties(org.id)
    if (!reconciled.ok) console.error('[webhook] Falha ao ajustar propriedades adicionais', org.id, reconciled.message)
  }

  // Create/update profile — only set organization_id for users without an org
  if (userId) {
    try {
      const organizationId = existingProfile?.organization_id || org!.id
      await createUserProfile({
        userId,
        email,
        fullName: email.split('@')[0],
        role: UserRole.ADMIN,
        accessAllProperties: true,
        organizationId,
      })
      await invalidateCachedProfile(userId)
      console.log(`[webhook] Perfil admin criado/actualizado: ${email} → org ${organizationId}`)
    } catch (error) {
      console.error('[webhook] Erro ao criar/actualizar perfil para', email, ':', error)
      throw error
    }
  }
}

async function handleSubscriptionUpdated(supabase: AdminClient, subscription: Stripe.Subscription) {
  const status = subscription.status === 'active' ? 'active'
    : subscription.status === 'past_due' ? 'past_due'
    : subscription.status === 'canceled' ? 'cancelled'
    : subscription.status === 'trialing' ? 'trial'
    : subscription.status

  // Item base = o que não é propriedade adicional
  const baseItem = subscription.items.data.find(item => !isExtraPropertyPriceId((item.price as Stripe.Price).id))
  const plan = baseItem ? getPlanFromPriceId((baseItem.price as Stripe.Price).id) : null

  const update: Record<string, unknown> = {
    subscription_status: status,
    billing_currency: toBillingCurrency(subscription.currency),
    updated_at: new Date().toISOString(),
  }
  // Preço desconhecido não rebaixa o plano: mantém o que está gravado
  if (plan) {
    update.plan = plan
    update.subscription_plan = plan
  }
  if (baseItem) update.stripe_subscription_item_id = baseItem.id

  const { data: updatedOrgs } = await supabase
    .from('organizations')
    .update(update)
    .eq('stripe_subscription_id', subscription.id)
    .select('id')

  if (updatedOrgs?.[0]?.id) await invalidateCachedSubscriptionStatus(updatedOrgs[0].id)
}
