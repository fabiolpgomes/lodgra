import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformStripe } from '@/lib/stripe/platform'
import { toBillingCurrency } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const supabase = createAdminClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id, billing_currency')
    .eq('id', auth.organizationId!)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'Sem conta de faturação' }, { status: 400 })
  }

  // O cliente existe na conta Stripe da moeda da assinatura
  const stripe = getPlatformStripe(toBillingCurrency(org.billing_currency))
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
  })

  return NextResponse.json({ url: session.url })
}
