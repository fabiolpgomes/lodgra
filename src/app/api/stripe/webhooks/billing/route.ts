import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStripeSignature } from '@/lib/stripe/verify-webhook'
import { handleSubscriptionEvent } from '@/lib/stripe/webhooks/subscription'
import { handleInvoiceEvent } from '@/lib/stripe/webhooks/invoice'
import { getClientIp, checkWebhookRateLimit } from '@/lib/middleware/rate-limit'

const STRIPE_BR_WEBHOOK_SECRET = process.env.STRIPE_BR_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  // Story 12.4: Apply rate limiting (10 req/min per IP)
  const ip = getClientIp(request)
  const rateCheck = await checkWebhookRateLimit(ip)

  if (!rateCheck.allowed) {
    console.warn(`[webhooks/billing] Rate limit exceeded for IP: ${ip}`)
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
    console.error('[webhooks/billing] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  try {
    const isValid = verifyStripeSignature(body, signature, STRIPE_BR_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('[webhooks/billing] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const adminClient = createAdminClient()

    console.log(`[webhooks/billing] Processing event: ${event.type} (${event.id})`)

    const { data: existingEvent } = await adminClient
      .from('stripe_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (existingEvent) {
      console.log(`[webhooks/billing] Event already processed: ${event.id}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (event.type.startsWith('customer.subscription.')) {
      await handleSubscriptionEvent(event, adminClient)
    } else if (event.type.startsWith('invoice.')) {
      await handleInvoiceEvent(event, adminClient)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[webhooks/billing] Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
