/**
 * Booking.com Integration — Central Export Point
 *
 * Exports all utilities for Booking.com API integration:
 * - Webhook validation (HMAC-SHA256)
 * - Rate limiting
 * - Reservation sync (Phase 2)
 * - API client (Phase 3)
 */

export {
  validateBookingWebhookSignature,
  parseBookingWebhookPayload,
  deriveReservationStatus,
  type BookingWebhookPayload,
} from './webhook-validator'

export { checkBookingWebhookRateLimit } from './rate-limiter'

// Phase 2: Reservation sync
export { syncBookingReservation, type SyncResult } from './reservation-sync'

// Phase 3: Booking API client
export { BookingComClient, createBookingComClient } from './client'
