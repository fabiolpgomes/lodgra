import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapBookingEventToUpdate } from '@/lib/webhooks/event-mappers'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint para eventos de reserva do Booking.com
 * POST /api/webhooks/booking/reservation
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-booking-signature')

    if (!signature) {
      console.warn('[Booking Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // Validar assinatura
    if (!webhookManager.validateBookingSignature(payload, signature)) {
      console.warn('[Booking Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(payload)
    const eventId = event.id || `booking_${Date.now()}`

    console.log(`[Booking Webhook] Received event: ${event.event_type} (${eventId})`)

    // Log webhook event
    await webhookManager.logWebhookEvent('booking', eventId, event, 'pending')

    // Extrair booking_reference do payload
    const bookingReference = event.reservation?.id
    if (!bookingReference) {
      console.warn('[Booking Webhook] No booking ID in payload')
      await webhookManager.logWebhookEvent('booking', eventId, event, 'failed', 'No booking ID')
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 })
    }

    // Mapear evento para updates
    const updates = mapBookingEventToUpdate(event)

    try {
      // Atualizar reserva
      await webhookManager.updateReservationFromWebhook(bookingReference, updates, 'booking')

      // Log sucesso
      await webhookManager.logWebhookEvent('booking', eventId, event, 'processed')
      console.log(`[Booking Webhook] ✅ Event processed: ${eventId}`)

      return NextResponse.json({ success: true, eventId })
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
