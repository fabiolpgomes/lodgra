import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateCachedSubscriptionStatus } from '@/lib/cache/subscriptionCache'
import { getPlanFromPriceId } from '@/lib/billing/plans'

type AdminClient = ReturnType<typeof createAdminClient>

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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

  // Criar slug único
  const slug = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 40)
    + '-' + Date.now().toString(36)

  // Criar organização
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: email.split('@')[0],
      slug,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: 'active',
      subscription_plan: plan,
      stripe_subscription_item_id: stripeSubscriptionItemId,
      stripe_metered_item_id: stripeMeteredItemId,
      billing_unit_count: 1,
    })
    .select()
    .single()

  if (orgError || !org) {
    console.error('Erro ao criar organização:', orgError)
    return
  }

  // Verificar se utilizador já existe via user_profiles (O(log n) com índice)
  // Evita o listUsers() O(n) que degrada com o número de tenants.
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  let userId: string | undefined

  if (existingProfile?.id) {
    // Utilizador já existe — apenas actualizar o perfil
    userId = existingProfile.id
    console.log(`Utilizador já existe: ${email} (${userId})`)
  } else {
    // Novo utilizador — enviar convite por email
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: { organization_id: org.id },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding`,
      }
    )
    if (inviteError) {
      // Edge case: utilizador existe em auth.users mas não tem user_profile ainda
      // (ex: OAuth incompleto). O próximo login cria/associa o perfil normalmente.
      if (inviteError.message?.toLowerCase().includes('already been registered')) {
        console.warn(`[webhook] ${email} existe em auth.users sem user_profile — será associado no próximo login`)
      } else {
        console.error('Erro ao convidar utilizador:', inviteError)
      }
    } else {
      userId = inviteData?.user?.id
      // Auto-confirm email so the user can set password and log in immediately
      // after completing the Stripe checkout — avoids the "Email not confirmed" block.
      if (userId) {
        await supabase.auth.admin.updateUserById(userId, { email_confirm: true })
      }
    }
  }

  // Criar/actualizar perfil com role admin
  if (userId) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        full_name: email.split('@')[0],
        role: 'admin',
        access_all_properties: true,
        organization_id: org.id,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
    } else {
      console.log(`Perfil admin criado/actualizado: ${email} → org ${org.id}`)
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
  let plan = 'starter'

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
