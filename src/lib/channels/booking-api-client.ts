/**
 * Booking.com Pull API client — fetches reservations from Booking.com.
 * Used by the pull-sync endpoint (Story 15.3).
 * Base URL: sandbox until Connectivity Program approval.
 */

export interface BookingReservationItem {
  id: string              // external reservation ID
  property_id: string
  guest: {
    name: string
    email?: string
  }
  check_in: string        // YYYY-MM-DD
  check_out: string       // YYYY-MM-DD
  number_of_guests: number
  status: 'CONFIRMED' | 'CANCELLED' | string
  total_price: {
    currency: string
    amount: number
  }
  created_at: string
  updated_at: string
}

export interface BookingPullResult {
  reservations: BookingReservationItem[]
  error?: string
}

const BOOKING_API_BASE =
  process.env.BOOKING_API_BASE_URL ?? 'https://api.booking.com/v1'

/**
 * Fetch reservations from Booking.com for a given property and date range.
 * Returns all reservations in the window regardless of status.
 */
export async function fetchBookingReservations(
  externalPropertyId: string,
  apiKey: string,
  dateFrom: string,
  dateTo: string
): Promise<BookingPullResult> {
  const url = new URL(`${BOOKING_API_BASE}/reservations`)
  url.searchParams.set('property_id', externalPropertyId)
  url.searchParams.set('date_from', dateFrom)
  url.searchParams.set('date_to', dateTo)

  let response: Response
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { reservations: [], error: `Network error: ${msg}` }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      reservations: [],
      error: `Booking.com API returned ${response.status}: ${body.slice(0, 200)}`,
    }
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return { reservations: [], error: 'Booking.com API returned non-JSON response' }
  }

  const data = json as { reservations?: BookingReservationItem[] }
  return { reservations: data.reservations ?? [] }
}

/**
 * Validate Booking.com credentials by attempting a test request.
 * Returns null on success, or an error message string.
 */
export async function validateBookingCredentials(
  externalPropertyId: string,
  apiKey: string
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10)
  const result = await fetchBookingReservations(
    externalPropertyId,
    apiKey,
    today,
    today
  )
  return result.error ?? null
}
