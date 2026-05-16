import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { getServerSession } from 'next-auth/next'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { plan } = await request.json()
    const planId = getPlanId(plan)

    if (!planId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)

    const subscription = await stripeBR.subscriptions.create({
      customer: org.stripe_br_customer_id,
      items: [{ price: planId }],
      trial_end: Math.floor(trialEndDate.getTime() / 1000),
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    })

    await adminClient
      .from('organizations')
      .update({
        subscription_plan: plan,
        subscription_status: 'trialing',
        trial_ends_at: trialEndDate.toISOString(),
      })
      .eq('id', profile.organization_id)

    console.log(`[billing/subscription] Subscription created: ${subscription.id} (plan: ${plan})`)

    return NextResponse.json({
      subscription_id: subscription.id,
      plan,
      status: subscription.status,
      trial_end: trialEndDate.toISOString(),
    })
  } catch (error) {
    console.error('[billing/subscription] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id, subscription_plan, subscription_status, trial_ends_at')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const subscriptions = await stripeBR.subscriptions.list({
      customer: org.stripe_br_customer_id,
      limit: 1,
      expand: ['data.latest_invoice'],
    })

    const subscription = subscriptions.data[0]

    if (!subscription) {
      return NextResponse.json({
        subscription_id: null,
        plan: null,
        status: 'no_subscription',
      })
    }

    const trialEndsIn = org.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : null

    return NextResponse.json({
      subscription_id: subscription.id,
      plan: org.subscription_plan,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: org.trial_ends_at,
      trial_days_remaining: trialEndsIn,
      items: subscription.items.data.map((item) => ({
        price_id: item.price.id,
        product: item.price.product,
      })),
    })
  } catch (error) {
    console.error('[billing/subscription] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { plan } = await request.json()
    const newPlanId = getPlanId(plan)

    if (!newPlanId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const subscriptions = await stripeBR.subscriptions.list({
      customer: org.stripe_br_customer_id,
      limit: 1,
    })

    const subscription = subscriptions.data[0]
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const updatedSubscription = await stripeBR.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPlanId,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    await adminClient
      .from('organizations')
      .update({
        subscription_plan: plan,
      })
      .eq('id', profile.organization_id)

    console.log(
      `[billing/subscription] Upgraded subscription: ${subscription.id} → ${plan}`
    )

    return NextResponse.json({
      subscription_id: updatedSubscription.id,
      plan,
      status: updatedSubscription.status,
      current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[billing/subscription] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('email', session.user.email)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { mode } = await request.json()
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const subscriptions = await stripeBR.subscriptions.list({
      customer: org.stripe_br_customer_id,
      limit: 1,
    })

    const subscription = subscriptions.data[0]
    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const _cancelationDate = mode === 'end_of_period' ? undefined : 'now'

    const canceledSubscription = await stripeBR.subscriptions.del(subscription.id, {
      invoice_now: mode === 'now',
      prorate: mode === 'now',
    })

    await adminClient
      .from('organizations')
      .update({
        subscription_status: 'canceled',
        subscription_plan: null,
      })
      .eq('id', profile.organization_id)

    console.log(`[billing/subscription] Subscription canceled: ${subscription.id}`)

    return NextResponse.json({
      subscription_id: canceledSubscription.id,
      status: canceledSubscription.status,
      canceled_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[billing/subscription] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

function getPlanId(plan: string): string | null {
  const planIds: Record<string, string> = {
    starter: process.env.STRIPE_PLAN_STARTER_ID!,
    professional: process.env.STRIPE_PLAN_PROFESSIONAL_ID!,
    enterprise: process.env.STRIPE_PLAN_ENTERPRISE_ID!,
  }
  return planIds[plan] || null
}
