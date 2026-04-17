import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Only admins can cancel subscription
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const supabase = createAdminClient()

  try {
    await request.json()

    // Get current org subscription
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_status')
      .eq('id', auth.organizationId)
      .single()

    if (orgError) {
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      )
    }

    if (!org?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Organização não tem subscrição ativa' },
        { status: 400 }
      )
    }

    if (org.subscription_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscrição já foi cancelada' },
        { status: 400 }
      )
    }

    // Cancel subscription on Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(
      org.stripe_subscription_id
    )

    // Update org status in DB
    // Webhook will also update it, but do it immediately for UX
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.organizationId)

    console.log(`[cancel-subscription] Subscription ${org.stripe_subscription_id} cancelled for org ${auth.organizationId}`)

    return NextResponse.json({
      success: true,
      subscription_id: canceledSubscription.id,
      status: 'cancelled',
    })
  } catch (error: unknown) {
    console.error('[cancel-subscription] Error:', error)

    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Subscrição não encontrada no Stripe' },
          { status: 404 }
        )
      }
    }

    const message = error instanceof Error ? error.message : 'Erro ao cancelar subscrição'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
