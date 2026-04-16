import crypto from 'crypto'

/**
 * Validate email format using a simple regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

/**
 * Validate ISO-8601 date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false

  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * Booking.com webhook payload structure
 */
export interface BookingWebhookPayload {
  event_id: string
  timestamp: string
  event_type: 'reservation.created' | 'reservation.modified' | 'reservation.cancelled'
  data: {
    reservation: {
      id: string // external_id in our DB
      property_id: string
      guest: {
        name: string
        email?: string
      }
      check_in: string // YYYY-MM-DD
      check_out: string // YYYY-MM-DD
      number_of_guests: number
      status: 'CONFIRMED' | 'CANCELLED' | string
      total_price: {
        currency: string
        amount: number
      }
      created_at: string // ISO-8601
      updated_at: string // ISO-8601
    }
  }
}

/**
 * Validate HMAC-SHA256 signature from Booking.com webhook
 *
 * Booking.com computes: Base64(HMAC-SHA256(payload, BOOKING_WEBHOOK_SECRET))
 * and sends in X-Booking-Signature header
 *
 * Uses timing-safe comparison to prevent timing attacks
 */
export function validateBookingWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn('[Booking Validator] Missing signature or secret')
    return false
  }

  try {
    // Compute expected signature
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(rawBody, 'utf-8')
    const computedSignature = hmac.digest('base64')

    // Timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    )
  } catch (error) {
    console.error('[Booking Validator] Signature validation error:', error)
    return false
  }
}

/**
 * Parse and validate Booking webhook payload structure
 * Throws if payload is invalid or missing required fields
 */
export function parseBookingWebhookPayload(
  body: unknown
): BookingWebhookPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid payload: not an object')
  }

  const payload = body as Record<string, unknown>

  // Validate required top-level fields
  if (!payload.event_id || typeof payload.event_id !== 'string') {
    throw new Error('Invalid payload: missing event_id')
  }

  if (!payload.timestamp || typeof payload.timestamp !== 'string') {
    throw new Error('Invalid payload: missing timestamp')
  }

  if (!payload.event_type || typeof payload.event_type !== 'string') {
    throw new Error('Invalid payload: missing event_type')
  }

  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Invalid payload: missing data object')
  }

  const data = payload.data as Record<string, unknown>
  if (!data.reservation || typeof data.reservation !== 'object') {
    throw new Error('Invalid payload: missing reservation in data')
  }

  const reservation = data.reservation as Record<string, unknown>

  // Validate reservation fields
  const requiredFields = [
    'id',
    'property_id',
    'check_in',
    'check_out',
    'number_of_guests',
    'status',
    'total_price',
  ]
  for (const field of requiredFields) {
    if (!(field in reservation) || reservation[field] === undefined || reservation[field] === null) {
      throw new Error(`Invalid payload: missing reservation.${field}`)
    }
  }

  if (!reservation.guest || typeof reservation.guest !== 'object') {
    throw new Error('Invalid payload: missing guest object')
  }

  const guest = reservation.guest as Record<string, unknown>
  if (!guest.name || typeof guest.name !== 'string') {
    throw new Error('Invalid payload: missing guest.name')
  }

  // Validate total_price structure
  const totalPrice = reservation.total_price as Record<string, unknown>
  if (!totalPrice.currency || !('amount' in totalPrice)) {
    throw new Error('Invalid payload: invalid total_price structure')
  }

  // ──────────────────────────────────────────────────────────────
  // VALIDATE CONTENT (security hardening)
  // ──────────────────────────────────────────────────────────────

  // Validate dates
  const checkIn = reservation.check_in as string
  const checkOut = reservation.check_out as string
  if (!isValidDate(checkIn)) {
    throw new Error('Invalid payload: check_in not in YYYY-MM-DD format')
  }
  if (!isValidDate(checkOut)) {
    throw new Error('Invalid payload: check_out not in YYYY-MM-DD format')
  }
  // Verify check_out is after check_in
  if (new Date(checkOut) <= new Date(checkIn)) {
    throw new Error('Invalid payload: check_out must be after check_in')
  }

  // Validate amount > 0
  const amount = totalPrice.amount as number
  if (typeof amount !== 'number' || amount <= 0 || amount > 1_000_000) {
    throw new Error('Invalid payload: total_price.amount must be between 0.01 and 999,999.99')
  }

  // Validate number_of_guests >= 1
  const numGuests = reservation.number_of_guests as number
  if (!Number.isInteger(numGuests) || numGuests < 1 || numGuests > 100) {
    throw new Error('Invalid payload: number_of_guests must be between 1 and 100')
  }

  // Validate guest name length and content
  const guestName = guest.name as string
  if (guestName.length === 0 || guestName.length > 255) {
    throw new Error('Invalid payload: guest.name must be 1-255 characters')
  }

  // Validate email if provided
  if (guest.email && typeof guest.email === 'string') {
    if (!isValidEmail(guest.email)) {
      throw new Error('Invalid payload: guest.email format invalid')
    }
  }

  // Validate currency is valid ISO-4217 code
  const currency = totalPrice.currency as string
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Invalid payload: currency must be 3-letter ISO code')
  }

  // Validate property_id length (prevent DoS)
  const propertyId = reservation.property_id as string
  if (propertyId.length === 0 || propertyId.length > 100) {
    throw new Error('Invalid payload: property_id must be 1-100 characters')
  }

  // Validate ID fields
  const reservationId = reservation.id as string
  if (reservationId.length === 0 || reservationId.length > 100) {
    throw new Error('Invalid payload: reservation.id must be 1-100 characters')
  }

  return payload as unknown as BookingWebhookPayload
}

/**
 * Derive reservation status from Booking.com event type
 * Maps Booking.com event types to our internal status values
 */
export function deriveReservationStatus(
  eventType: string
): 'confirmed' | 'cancelled' | 'pending_review' {
  switch (eventType) {
    case 'reservation.created':
      return 'confirmed'
    case 'reservation.modified':
      return 'confirmed'
    case 'reservation.cancelled':
      return 'cancelled'
    default:
      return 'pending_review'
  }
}
