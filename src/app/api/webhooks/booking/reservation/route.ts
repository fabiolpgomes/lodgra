import { NextRequest, NextResponse } from 'next/server'
import {
  validateBookingWebhookSignature,
  parseBookingWebhookPayload,
  deriveReservationStatus,
  type BookingWebhookPayload,
} from '@/lib/integrations/booking/webhook-validator'
import { checkBookingWebhookRateLimit } from '@/lib/integrations/booking/rate-limiter'
import { syncBookingReservation } from '@/lib/integrations/booking/reservation-sync'

/**
 * POST /api/webhooks/booking/reservation
 *
 * Booking.com webhook endpoint for real-time reservation notifications
 * - Validates HMAC-SHA256 signature
 * - Applies rate limiting (5 req/min per property_id)
 * - Returns 200 OK immediately (Booking.com requirement: < 5 seconds)
 * - Processes reservations asynchronously (via queue or immediate sync)
 *
 * Security:
 * - Extracts raw body BEFORE any JSON parsing
 * - Uses timing-safe comparison for signature validation
 * - Validates all required fields before processing
 * - Logs with request ID for traceability
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // ──────────────────────────────────────────────────────────────
    // 1. EXTRACT RAW BODY (before JSON parsing)
    // ──────────────────────────────────────────────────────────────
    let rawBody: string
    try {
      rawBody = await request.text()
    } catch (error) {
      console.error(`[Booking Webhook] ${requestId} Failed to read body:`, error)
      return NextResponse.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      )
    }

    if (!rawBody) {
      console.warn(`[Booking Webhook] ${requestId} Empty request body`)
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────────
    // 2. VALIDATE HMAC SIGNATURE
    // ──────────────────────────────────────────────────────────────
    const signature = request.headers.get('X-Booking-Signature')
    if (!signature) {
      console.warn(`[Booking Webhook] ${requestId} Missing X-Booking-Signature header`)
      return NextResponse.json(
        { error: 'Missing X-Booking-Signature header' },
        { status: 400 }
      )
    }

    const secret = process.env.BOOKING_WEBHOOK_SECRET
    if (!secret) {
      console.error(`[Booking Webhook] ${requestId} BOOKING_WEBHOOK_SECRET not configured`)
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    const signatureValid = validateBookingWebhookSignature(rawBody, signature, secret)
    if (!signatureValid) {
      console.warn(
        `[Booking Webhook] ${requestId} Invalid signature - potential tampering or wrong secret`
      )
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────────
    // 3. PARSE AND VALIDATE PAYLOAD
    // ──────────────────────────────────────────────────────────────
    let payload: BookingWebhookPayload
    try {
      const parsed = JSON.parse(rawBody)
      payload = parseBookingWebhookPayload(parsed)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`[Booking Webhook] ${requestId} Invalid payload: ${errorMsg}`)
      // Return generic error to client, detailed error logged server-side
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // ──────────────────────────────────────────────────────────────
    // 3.5 VALIDATE WEBHOOK TIMESTAMP FRESHNESS (prevent replay attacks)
    // ──────────────────────────────────────────────────────────────
    try {
      const webhookTime = new Date(payload.timestamp).getTime()
      const now = Date.now()
      const maxSkew = 15 * 60 * 1000 // 15 minutes
      if (now - webhookTime > maxSkew) {
        console.warn(
          `[Booking Webhook] ${requestId} Stale timestamp: ${payload.timestamp} (age: ${Math.round((now - webhookTime) / 1000)}s)`
        )
        // Log but still process (Booking.com might have clock skew)
        // In future, can reject if needed
      }
    } catch (error) {
      console.warn(`[Booking Webhook] ${requestId} Failed to validate timestamp: ${error}`)
      // Don't reject, timestamp validation is advisory
    }

    const propertyId = payload.data.reservation.property_id

    // ──────────────────────────────────────────────────────────────
    // 4. CHECK RATE LIMIT
    // ──────────────────────────────────────────────────────────────
    const rateLimitResult = await checkBookingWebhookRateLimit(propertyId)
    if (!rateLimitResult.success) {
      console.warn(
        `[Booking Webhook] ${requestId} Rate limit exceeded for property: ${propertyId}`
      )
      // Return 429 with generic message
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    // ──────────────────────────────────────────────────────────────
    // 5. LOG WEBHOOK RECEIPT
    // ──────────────────────────────────────────────────────────────
    console.log(`[Booking Webhook] ${requestId} Received ${payload.event_type}`, {
      event_id: payload.event_id,
      property_id: propertyId,
      reservation_id: payload.data.reservation.id,
      status: deriveReservationStatus(payload.event_type),
    })

    // ──────────────────────────────────────────────────────────────
    // 6. RETURN 200 IMMEDIATELY (Booking.com requirement)
    // ──────────────────────────────────────────────────────────────
    // Process asynchronously to avoid timeout. In production, use:
    // - Background job queue (Bull, Inngest, etc.)
    // - Firebase Cloud Tasks
    // - AWS SQS
    // For now, we'll process in the response handler
    const responsePromise = NextResponse.json(
      { success: true, request_id: requestId },
      { status: 200 }
    )

    // ──────────────────────────────────────────────────────────────
    // 7. PROCESS ASYNCHRONOUSLY (fire-and-forget)
    // ──────────────────────────────────────────────────────────────
    // Sync to database asynchronously (don't wait for response)
    syncBookingReservation(payload, requestId).catch((error) => {
      console.error(`[Booking Webhook] ${requestId} Sync failed:`, error)
    })

    console.log(`[Booking Webhook] ${requestId} Webhook processed successfully`)
    return responsePromise
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[Booking Webhook] Unexpected error:`, errorMsg, error)
    // Return 200 to avoid Booking.com retry loop, but log the error
    return NextResponse.json(
      { success: false, error: 'Internal processing error' },
      { status: 200 } // 200 to prevent Booking from retrying
    )
  }
}
