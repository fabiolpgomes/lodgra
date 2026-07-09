import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapAirbnbEventToUpdate } from '@/lib/webhooks/event-mappers'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint para eventos de reserva do Airbnb
 * POST /api/webhooks/airbnb/reservation
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-airbnb-hmac-sha256')

    if (!signature) {
      console.warn('[Airbnb Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // Validar assinatura
    if (!webhookManager.validateAirbnbSignature(payload, signature)) {
      console.warn('[Airbnb Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(payload)
    const eventId = event.id || `airbnb_${Date.now()}`

    console.log(`[Airbnb Webhook] Received event: ${event.event_type} (${eventId})`)

    // Log webhook event
    await webhookManager.logWebhookEvent('airbnb', eventId, event, 'pending')

    // Extrair booking_reference do payload
    const bookingReference = event.data?.reservation_id || event.reservation?.id
    if (!bookingReference) {
      console.warn('[Airbnb Webhook] No reservation ID in payload')
      await webhookManager.logWebhookEvent('airbnb', eventId, event, 'failed', 'No reservation ID')
      return NextResponse.json({ error: 'No reservation ID' }, { status: 400 })
    }

    // Mapear evento para updates
    const updates = mapAirbnbEventToUpdate(event)

    try {
      // Atualizar reserva
      await webhookManager.updateReservationFromWebhook(bookingReference, updates, 'airbnb')

      // Log sucesso
      await webhookManager.logWebhookEvent('airbnb', eventId, event, 'processed')
      console.log(`[Airbnb Webhook] ✅ Event processed: ${eventId}`)

      return NextResponse.json({ success: true, eventId })
    } catch (updateError) {
      console.error(`[Airbnb Webhook] Error updating reservation:`, updateError)
      await webhookManager.logWebhookEvent(
        'airbnb',
        eventId,
        event,
        'failed',
        updateError instanceof Error ? updateError.message : String(updateError)
      )

      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }
  } catch (error: unknown) {
    console.error('[Airbnb Webhook] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
