import { checkRateLimit } from '@/lib/rateLimit'

interface RateLimitResult {
  success: boolean
  retryAfter?: number
}

/**
 * Rate limit Booking.com webhook requests
 * Limit: 5 requests/minute per property_id
 * Falls back to in-memory if Redis unavailable
 */
export async function checkBookingWebhookRateLimit(
  propertyId: string
): Promise<RateLimitResult> {
  const limit = 5
  const windowMs = 60 * 1000 // 1 minute

  try {
    const allowed = checkRateLimit('booking:webhook', propertyId, limit, windowMs)

    if (!allowed) {
      return {
        success: false,
        retryAfter: 60, // Retry after 60 seconds
      }
    }

    return { success: true }
  } catch (error) {
    // Fail-open: Allow if rate limiter error (e.g., Redis down)
    console.warn('[Booking Webhook] Rate limiter error, failing open:', error)
    return { success: true }
  }
}
