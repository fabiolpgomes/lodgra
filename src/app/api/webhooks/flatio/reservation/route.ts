import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapFlatioEventToUpdate } from '@/lib/webhooks/event-mappers'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint para eventos de reserva do Flatio
 * POST /api/webhooks/flatio/reservation
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-flatio-signature')

    if (!signature) {
      console.warn('[Flatio Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // Validar assinatura
    if (!webhookManager.validateFlatioSignature(payload, signature)) {
      console.warn('[Flatio Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(payload)
    const eventId = event.id || `flatio_${Date.now()}`

    console.log(`[Flatio Webhook] Received event: ${event.type} (${eventId})`)

    // Log webhook event
    await webhookManager.logWebhookEvent('flatio', eventId, event, 'pending')

    // Extrair booking_reference do payload
    const bookingReference = event.booking?.id
    if (!bookingReference) {
      console.warn('[Flatio Webhook] No booking ID in payload')
      await webhookManager.logWebhookEvent('flatio', eventId, event, 'failed', 'No booking ID')
      return NextResponse.json({ error: 'No booking ID' }, { status: 400 })
    }

    // Mapear evento para updates
    const updates = mapFlatioEventToUpdate(event)

    try {
      // Atualizar reserva
      await webhookManager.updateReservationFromWebhook(bookingReference, updates, 'flatio')

      // Log sucesso
      await webhookManager.logWebhookEvent('flatio', eventId, event, 'processed')
      console.log(`[Flatio Webhook] ✅ Event processed: ${eventId}`)

      return NextResponse.json({ success: true, eventId })
    } catch (updateError) {
      console.error(`[Flatio Webhook] Error updating reservation:`, updateError)
      await webhookManager.logWebhookEvent(
        'flatio',
        eventId,
        event,
        'failed',
        updateError instanceof Error ? updateError.message : String(updateError)
      )

      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }
  } catch (error: unknown) {
    console.error('[Flatio Webhook] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
