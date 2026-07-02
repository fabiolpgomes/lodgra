/**
 * iCal Sync Webhook Notifications
 * Notifies platforms of calendar changes for faster synchronization
 *
 * Strategy:
 * 1. Try direct API push to platforms (Booking API, webhooks)
 * 2. Force iCal revalidation as backup (faster than 24h polling)
 * 3. Log all attempts for debugging
 */

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SyncWebhookPayload {
  event: 'reservation_cancelled' | 'block_removed'
  timestamp: string
  propertyId: string
  eventId: string
  eventData: {
    type: 'reservation' | 'block'
    checkIn: string
    checkOut: string
    title?: string
    reason?: string
  }
}

interface PlatformNotificationResult {
  platform: string
  success: boolean
  method: 'api_push' | 'ical_revalidate'
  message: string
  timestamp: string
}

/**
 * Notify platforms of sync event (cancellation, updates, etc)
 * Attempts direct API push first, falls back to iCal revalidation
 */
export async function notifyPlatformSync(payload: SyncWebhookPayload): Promise<void> {
  try {
    console.log('[iCal Webhook] Syncing to platforms:', {
      event: payload.event,
      propertyId: payload.propertyId,
      eventId: payload.eventId,
    })

    // Get property listings to know which platforms to notify
    const adminClient = createAdminClient()
    const { data: listings, error: listingsError } = await adminClient
      .from('property_listings')
      .select('id, platform_id, external_id, platforms!inner(name)')
      .eq('property_id', payload.propertyId)
      .eq('is_active', true)

    if (listingsError || !listings) {
      console.warn('[iCal Webhook] No active listings found for property:', payload.propertyId)
      return
    }

    const results: PlatformNotificationResult[] = []

    // Notify each platform
    for (const listing of listings) {
      const platformName = (listing.platforms as { name?: string } | null)?.name || 'unknown'

      try {
        // Try direct API push first
        if (payload.event === 'reservation_cancelled') {
          const apiResult = await notifyPlatformCancellation(
            platformName,
            listing.external_id,
            payload.eventData.checkIn,
            payload.eventData.checkOut
          )

          if (apiResult) {
            results.push({
              platform: platformName,
              success: true,
              method: 'api_push',
              message: `Cancelled notification sent via ${platformName} API`,
              timestamp: new Date().toISOString(),
            })
            continue
          }
        }

        // Fallback: Force iCal revalidation (faster than default polling)
        console.log(`[iCal Webhook] Falling back to iCal revalidation for ${platformName}`)
        revalidatePath('/(locale)/calendar', 'page')
        revalidatePath('/(locale)/reservations', 'page')

        results.push({
          platform: platformName,
          success: true,
          method: 'ical_revalidate',
          message: `iCal cache revalidated (platform will see change on next polling)`,
          timestamp: new Date().toISOString(),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[iCal Webhook] Error notifying ${platformName}:`, msg)
        results.push({
          platform: platformName,
          success: false,
          method: 'api_push',
          message: `Failed to notify: ${msg}`,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Log summary
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    console.log(`[iCal Webhook] Notification summary: ${succeeded} succeeded, ${failed} failed`, results)
  } catch (error) {
    console.error('[iCal Webhook] Critical error:', error)
    // Don't throw - webhook failures shouldn't block the main operation
  }
}

/**
 * Try to send cancellation notification via platform API
 * Returns true if successful, false if should fallback to iCal
 */
async function notifyPlatformCancellation(
  platform: string,
  externalPropertyId: string | null,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  try {
    switch (platform.toLowerCase()) {
      case 'booking':
        return await notifyBookingCancellation(externalPropertyId, checkIn, checkOut)
      case 'airbnb':
        // Airbnb doesn't have direct API for cancellations, use iCal
        return false
      case 'flatio':
        // Flatio similar to Airbnb
        return false
      default:
        console.warn(`[iCal Webhook] Unknown platform: ${platform}`)
        return false
    }
  } catch (err) {
    console.error(`[iCal Webhook] Error in platform notification for ${platform}:`, err)
    return false
  }
}

/**
 * Notify Booking.com of cancellation via their API
 * Uses the Booking Connectivity Program API
 */
async function notifyBookingCancellation(
  externalPropertyId: string | null,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  if (!externalPropertyId) {
    console.warn('[iCal Webhook] No external property ID for Booking')
    return false
  }

  const apiKey = process.env.BOOKING_API_KEY
  if (!apiKey) {
    console.warn('[iCal Webhook] BOOKING_API_KEY not configured')
    return false
  }

  try {
    // Booking API doesn't have direct "cancel reservation" endpoint
    // But we can mark property as unavailable for those dates
    // For now, log that we attempted and let iCal sync handle it
    console.log('[iCal Webhook] Booking cancellation notification registered', {
      propertyId: externalPropertyId,
      checkIn,
      checkOut,
    })

    // TODO: When Booking Connectivity Program is approved,
    // implement direct cancellation API call here
    // For now, iCal revalidation will handle the sync

    return false // Fallback to iCal
  } catch (err) {
    console.error('[iCal Webhook] Error notifying Booking:', err)
    return false
  }
}
