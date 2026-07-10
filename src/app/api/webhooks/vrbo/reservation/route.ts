import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapVrboEventToUpdate } from '@/lib/webhooks/event-mappers'

export const dynamic = 'force-dynamic'

/**
 * Webhook endpoint para eventos de reserva do VRBO/Expedia
 * POST /api/webhooks/vrbo/reservation
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-vrbo-signature')

    if (!signature) {
      console.warn('[VRBO Webhook] Missing signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
    }

    // Validar assinatura
    if (!webhookManager.validateVrboSignature(payload, signature)) {
      console.warn('[VRBO Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const event = JSON.parse(payload)
    const eventId = event.id || `vrbo_${Date.now()}`

    console.log(`[VRBO Webhook] Received event: ${event.eventType} (${eventId})`)

    // Log webhook event
    await webhookManager.logWebhookEvent('vrbo', eventId, event, 'pending')

    // Extrair booking_reference do payload
    const bookingReference = event.reservation?.id
    if (!bookingReference) {
      console.warn('[VRBO Webhook] No reservation ID in payload')
      await webhookManager.logWebhookEvent('vrbo', eventId, event, 'failed', 'No reservation ID')
      return NextResponse.json({ error: 'No reservation ID' }, { status: 400 })
    }

    // Mapear evento para updates
    const updates = mapVrboEventToUpdate(event)

    try {
      // Atualizar reserva
      await webhookManager.updateReservationFromWebhook(bookingReference, updates, 'vrbo')

      // Log sucesso
      await webhookManager.logWebhookEvent('vrbo', eventId, event, 'processed')
      console.log(`[VRBO Webhook] ✅ Event processed: ${eventId}`)

      return NextResponse.json({ success: true, eventId })
    } catch (updateError) {
      console.error(`[VRBO Webhook] Error updating reservation:`, updateError)
      await webhookManager.logWebhookEvent(
        'vrbo',
        eventId,
        event,
        'failed',
        updateError instanceof Error ? updateError.message : String(updateError)
      )

      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 })
    }
  } catch (error: unknown) {
    console.error('[VRBO Webhook] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
