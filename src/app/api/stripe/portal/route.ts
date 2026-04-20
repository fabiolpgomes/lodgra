import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const supabase = createAdminClient()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', auth.organizationId!)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'Sem conta de faturação' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
  })

  return NextResponse.json({ url: session.url })
}
