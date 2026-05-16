import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { getServerSession } from 'next-auth/next'

export async function GET(request: NextRequest) {
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
      .select('stripe_br_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const invoices = await stripeBR.invoices.list({
      customer: org.stripe_br_customer_id,
      limit: 100,
    })

    return NextResponse.json({
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000).toISOString(),
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        pdf_url: invoice.invoice_pdf,
        paid_at: invoice.paid_at ? new Date(invoice.paid_at * 1000).toISOString() : null,
      })),
    })
  } catch (error) {
    console.error('[billing/invoices] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
