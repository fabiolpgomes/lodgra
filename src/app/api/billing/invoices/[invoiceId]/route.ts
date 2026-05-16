import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    if (!auth.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_br_customer_id')
      .eq('id', auth.organizationId)
      .single()

    if (!org?.stripe_br_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
    }

    const invoice = await stripeBR.invoices.retrieve(params.invoiceId)

    if (invoice.customer !== org.stripe_br_customer_id) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({
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
      subscription_id: invoice.subscription,
      lines: invoice.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount,
        currency: line.currency,
        period: {
          start: new Date(line.period.start * 1000).toISOString(),
          end: new Date(line.period.end * 1000).toISOString(),
        },
      })),
    })
  } catch (error) {
    console.error('[billing/invoices/[id]] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
