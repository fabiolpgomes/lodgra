import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export class WebhookManager {
  private supabase: ReturnType<typeof createAdminClient> | null = null

  private getSupabase(): ReturnType<typeof createAdminClient> {
    if (!this.supabase) {
      this.supabase = createAdminClient()
    }
    return this.supabase
  }

  /**
   * Validar assinatura HMAC-SHA256 do webhook
   */
  validateBookingSignature(payload: string, signature: string): boolean {
    const secret = process.env.BOOKING_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  /**
   * Validar assinatura Airbnb
   * Airbnb usa X-Airbnb-Hmac-SHA256 header
   */
  validateAirbnbSignature(payload: string, signature: string): boolean {
    const secret = process.env.AIRBNB_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')

    return signature === expected
  }

  /**
   * Validar assinatura VRBO/Expedia
   * VRBO usa X-VRBO-Signature header com HMAC-SHA256
   */
  validateVrboSignature(payload: string, signature: string): boolean {
    const secret = process.env.VRBO_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  /**
   * Validar assinatura Flatio
   * Flatio usa X-Flatio-Signature header com HMAC-SHA256
   */
  validateFlatioSignature(payload: string, signature: string): boolean {
    const secret = process.env.FLATIO_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  }

  /**
   * Log webhook event para auditoria
   */
  async logWebhookEvent(
    webhookType: 'booking' | 'airbnb' | 'vrbo' | 'flatio',
    eventId: string,
    payload: Record<string, unknown>,
    status: 'pending' | 'processed' | 'failed' = 'pending',
    error?: string
  ) {
    try {
      await this.supabase
        .from('webhook_events')
        .upsert(
          {
            webhook_type: webhookType,
            event_id: eventId,
            payload,
            status,
            last_error: error || null,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'event_id' }
        )
    } catch (err) {
      console.error(`[WebhookManager] Error logging webhook event:`, err)
    }
  }

  /**
   * Retry failed webhooks
   */
  async retryFailedWebhooks() {
    try {
      const { data: failed } = await this.supabase
        .from('webhook_events')
        .select('*')
        .eq('status', 'failed')
        .lt('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(10)

      if (!failed) return

      for (const event of failed) {
        try {
          // Attempt to reprocess
          await this.supabase
            .from('webhook_events')
            .update({
              retry_count: (event.retry_count || 0) + 1,
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', event.id)
        } catch (err) {
          console.error(`[WebhookManager] Retry failed for event ${event.id}:`, err)
        }
      }
    } catch (err) {
      console.error(`[WebhookManager] Error in retryFailedWebhooks:`, err)
    }
  }

  /**
   * Atualizar reserva a partir de webhook
   */
  async updateReservationFromWebhook(
    bookingReference: string,
    updates: Record<string, unknown>,
    webhookSource: 'booking' | 'airbnb' | 'vrbo' | 'flatio'
  ) {
    try {
      const { data: reservation, error: fetchError } = await this.supabase
        .from('reservations')
        .select('id, booking_source')
        .eq('booking_reference', bookingReference)
        .eq('booking_source', webhookSource)
        .single()

      if (fetchError || !reservation) {
        throw new Error(`Reservation not found for ${webhookSource}:${bookingReference}`)
      }

      const { error: updateError } = await this.supabase
        .from('reservations')
        .update({
          ...updates,
          webhook_synced_at: new Date().toISOString(),
        })
        .eq('id', reservation.id)

      if (updateError) throw updateError
    } catch (err) {
      console.error(`[WebhookManager] Error updating reservation:`, err)
      throw err
    }
  }
}

export const webhookManager = new WebhookManager()
