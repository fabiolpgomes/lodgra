import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStripeSignature } from '@/lib/stripe/verify-webhook'
import { getClientIp, checkWebhookRateLimit } from '@/lib/middleware/rate-limit'
import { processWebhookWithRetry } from '@/lib/stripe/webhooks/retry'

const STRIPE_PT_WEBHOOK_SECRET = process.env.STRIPE_PT_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  // Story 12.4: Apply rate limiting (10 req/min per IP)
  const ip = getClientIp(request)
  const rateCheck = await checkWebhookRateLimit(ip)

  if (!rateCheck.allowed) {
    console.warn(`[webhooks/booking] Rate limit exceeded for IP: ${ip}`)
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded (10 req/min)' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const signature = request.headers.get('stripe-signature')
  const body = await request.text()

  if (!signature) {
    console.error('[webhooks/booking] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const isValid = verifyStripeSignature(body, signature, STRIPE_PT_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('[webhooks/booking] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const adminClient = createAdminClient()

    console.log(`[webhooks/booking] Processing event: ${event.type} (${event.id})`)

    const { data: existingEvent } = await adminClient
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      console.log(`[webhooks/booking] Event already processed: ${event.id}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const charge = event.data?.object
    if (!charge || !charge.id) {
      console.warn(`[webhooks/booking] Event missing charge object: ${event.type}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const { data: payment } = await adminClient
      .from('payments')
      .select('organization_id')
      .eq('stripe_payment_id', charge.id)
      .single()

    if (!payment) {
      console.warn(`[webhooks/booking] Payment not found for charge: ${charge.id}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    await adminClient.from('stripe_events').insert({
      organization_id: payment.organization_id,
      event_type: event.type,
      stripe_event_id: event.id,
      payload: charge,
      processed_at: new Date().toISOString(),
    })

    switch (event.type) {
      case 'charge.succeeded':
        await processWebhookWithRetry(event.id, async () => {
          await adminClient
            .from('payments')
            .update({
              status: 'succeeded',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_id', charge.id)
          console.log(
            `[webhooks/booking] Charge succeeded: ${charge.id} (${charge.amount})`
          )
        })
        break

      case 'charge.failed':
        await processWebhookWithRetry(event.id, async () => {
          await adminClient
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_id', charge.id)
          console.warn(`[webhooks/booking] Charge failed: ${charge.id}`)
        })
        break

      case 'charge.refunded':
        const refund = charge.refunds?.data?.[0]
        if (refund) {
          await processWebhookWithRetry(event.id, async () => {
            await adminClient
              .from('payments')
              .update({
                status: 'refunded',
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_payment_id', charge.id)
            console.log(
              `[webhooks/booking] Charge refunded: ${charge.id} (${refund.amount})`
            )
          })
        }
        break

      case 'charge.dispute.created':
        console.warn(`[webhooks/booking] Dispute created for charge: ${charge.id}`)
        break
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[webhooks/booking] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
