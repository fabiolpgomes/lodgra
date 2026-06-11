import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'
import { getPlanFromPriceId } from '@/lib/billing/plans'
import { UserRole } from '@/lib/auth/role-types'
import { createUserProfile } from '@/lib/auth/create-user-profile'

type AdminClient = ReturnType<typeof createAdminClient>

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-02-25.clover',
  })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
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
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(supabase: AdminClient, session: Stripe.Checkout.Session) {
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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Detect plan from metadata or line_items price
  const planFromMeta = session.metadata?.plan
  const priceId = (session as Stripe.Checkout.Session & { line_items?: { data: { price?: { id: string } }[] } }).line_items?.data[0]?.price?.id ?? ''
  const plan = planFromMeta ?? getPlanFromPriceId(priceId)

  // Fetch subscription to extract item IDs (base + metered)
  let stripeSubscriptionItemId: string | null = null
  let stripeMeteredItemId: string | null = null

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    })
    for (const item of sub.items.data) {
      const price = item.price as Stripe.Price
      if (price.recurring?.usage_type === 'metered') {
        stripeMeteredItemId = item.id
      } else {
        stripeSubscriptionItemId = item.id
      }
    }
  } catch (err) {
    console.warn('[webhook] Could not fetch subscription items:', err)
  }

  const stripeOrgFields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    subscription_status: 'active' as const,
    plan,
    subscription_plan: plan,
    stripe_subscription_item_id: stripeSubscriptionItemId,
    stripe_metered_item_id: stripeMeteredItemId,
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
    // No org found — create a new one
    const slug = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 40)
      + '-' + Date.now().toString(36)

    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: email.split('@')[0],
        slug,
        billing_unit_count: 1,
        ...stripeOrgFields,
      })
      .select('id')
      .single()

    if (orgError || !newOrg) {
      console.error('[webhook] Erro ao criar organização:', orgError)
      return
    }
    org = newOrg

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

  // Identify base item and metered item by usage_type
  let baseItemId: string | null = null
  let meteredItemId: string | null = null
  let plan = 'essencial'

  for (const item of subscription.items.data) {
    const price = item.price as Stripe.Price
    if (price.recurring?.usage_type === 'metered') {
      meteredItemId = item.id
    } else {
      baseItemId = item.id
      plan = getPlanFromPriceId(price.id)
    }
  }

  const update: Record<string, unknown> = {
    subscription_status: status,
    plan,
    subscription_plan: plan,
    updated_at: new Date().toISOString(),
  }
  if (baseItemId)   update.stripe_subscription_item_id = baseItemId
  if (meteredItemId) update.stripe_metered_item_id = meteredItemId

  const { data: updatedOrgs } = await supabase
    .from('organizations')
    .update(update)
    .eq('stripe_subscription_id', subscription.id)
    .select('id')

  if (updatedOrgs?.[0]?.id) await invalidateCachedSubscriptionStatus(updatedOrgs[0].id)
}
