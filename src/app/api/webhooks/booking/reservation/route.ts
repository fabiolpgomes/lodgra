import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { syncBookingReservation } from '@/lib/integrations/booking/reservation-sync'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint para eventos de reserva do Booking.com
 * POST /api/webhooks/booking/reservation
 */
export async function POST(request: NextRequest) {
  try {
    // Check if webhook secret is configured
    if (!process.env.BOOKING_WEBHOOK_SECRET) {
      console.error('[Booking Webhook] BOOKING_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const payload = await request.text()
    const signature = request.headers.get('x-booking-signature')

    if (!signature) {
      console.warn('[Booking Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing X-Booking-Signature' }, { status: 400 })
    }

    if (!payload) {
      console.warn('[Booking Webhook] Empty body')
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    // Validar assinatura
    if (!webhookManager.validateBookingSignature(payload, signature)) {
      console.warn('[Booking Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let event
    try {
      event = JSON.parse(payload)
    } catch {
      console.warn('[Booking Webhook] Invalid JSON')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Validar campos obrigatórios
    if (!event.event_id || !event.event_type || !event.data?.reservation) {
      console.warn('[Booking Webhook] Missing event_id')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const eventId = event.event_id || `booking_${Date.now()}`

    console.log(`[Booking Webhook] Received event: ${event.event_type} (${eventId})`)

    // Log webhook event
    await webhookManager.logWebhookEvent('booking', eventId, event, 'pending')

    // Extrair booking_reference do payload
    const bookingReference = event.data?.reservation?.id || event.reservation?.id
    if (!bookingReference) {
      console.warn('[Booking Webhook] No booking ID in payload')
      await webhookManager.logWebhookEvent('booking', eventId, event, 'failed', 'No booking ID')
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 })
    }

    try {
      const result = await syncBookingReservation(event, eventId)

      if (!result.success) {
        console.error(`[Booking Webhook] Error syncing reservation:`, result.error)
        await webhookManager.logWebhookEvent(
          'booking',
          eventId,
          event,
          'failed',
          result.error || 'Booking sync failed'
        )

        return NextResponse.json(
          { success: false, error: result.error || 'Reservation sync failed' },
          { status: 404 }
        )
      }

      // Log sucesso
      const requestId = randomUUID()
      await webhookManager.logWebhookEvent('booking', eventId, event, 'processed')
      console.log(`[Booking Webhook] ✅ Event processed: ${eventId}`)

      return NextResponse.json({ success: true, request_id: requestId })
    } catch (updateError) {
      console.error(`[Booking Webhook] Error updating reservation:`, updateError)
      await webhookManager.logWebhookEvent(
        'booking',
        eventId,
        event,
        'failed',
        updateError instanceof Error ? updateError.message : String(updateError)
      )

      // Se a reserva não existe, log mas 200 OK (webhook vai pensar que foi sucesso)
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }
  } catch (error: unknown) {
    console.error('[Booking Webhook] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
