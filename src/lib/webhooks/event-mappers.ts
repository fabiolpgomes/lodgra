/**
 * Event mappers for converting webhook payloads to reservation updates
 * Centraliza lógica de mapping para evitar inline code nos endpoints
 */

interface ReservationUpdate extends Record<string, unknown> {
  status?: string
  check_in?: string
  check_out?: string
  number_of_guests?: number
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  updated_at?: string
  webhook_synced_at?: string
}

interface BookingWebhookEvent {
  event_type: string
  reservation?: {
    check_in?: string
    check_out?: string
    guests?: number
    phone?: string
    guest_name?: string
  }
}

interface AirbnbWebhookEvent {
  event_type: string
  data?: {
    reservation?: {
      check_in_date?: string
      check_out_date?: string
      number_of_guests?: number
      guest?: {
        first_name?: string
        last_name?: string
        email?: string
        phone?: string
      }
    }
  }
  reservation?: {
    check_in_date?: string
    check_out_date?: string
    number_of_guests?: number
    guest?: {
      first_name?: string
      last_name?: string
      email?: string
      phone?: string
    }
  }
}

/**
 * Map Booking.com event to reservation update
 * Eventos: reservation_confirmed, reservation_changed, reservation_cancelled, reservation_completed
 */
export function mapBookingEventToUpdate(event: BookingWebhookEvent): ReservationUpdate {
  const { event_type, reservation } = event

  const statusMap: Record<string, string> = {
    reservation_confirmed: 'confirmed',
    reservation_changed: 'confirmed', // Event de mudança, mantém status
    reservation_cancelled: 'cancelled',
    reservation_completed: 'completed',
  }

  const updates: ReservationUpdate = {
    status: statusMap[event_type] || 'confirmed',
    updated_at: new Date().toISOString(),
    webhook_synced_at: new Date().toISOString(),
  }

  // Atualizar dados de check-in/check-out se disponíveis
  if (reservation?.check_in) {
    updates.check_in = reservation.check_in
  }
  if (reservation?.check_out) {
    updates.check_out = reservation.check_out
  }
  if (reservation?.guests) {
    updates.number_of_guests = reservation.guests
  }
  if (reservation?.phone) {
    updates.guest_phone = reservation.phone
  }
  if (reservation?.guest_name) {
    updates.guest_name = reservation.guest_name
  }

  return updates
}

/**
 * Map Airbnb event to reservation update
 * Eventos: RESERVATION_ACCEPTED, RESERVATION_CANCELLED, RESERVATION_PREAPPROVED
 */
export function mapAirbnbEventToUpdate(event: AirbnbWebhookEvent): ReservationUpdate {
  const { event_type } = event
  const reservation = event.data?.reservation || event.reservation

  const statusMap: Record<string, string> = {
    RESERVATION_ACCEPTED: 'confirmed',
    RESERVATION_CANCELLED: 'cancelled',
    RESERVATION_PREAPPROVED: 'pending',
  }

  const updates: ReservationUpdate = {
    status: statusMap[event_type] || 'confirmed',
    updated_at: new Date().toISOString(),
    webhook_synced_at: new Date().toISOString(),
  }

  // Airbnb data (if provided)
  if (reservation?.check_in_date) {
    updates.check_in = reservation.check_in_date
  }
  if (reservation?.check_out_date) {
    updates.check_out = reservation.check_out_date
  }
  if (reservation?.number_of_guests) {
    updates.number_of_guests = reservation.number_of_guests
  }
  if (reservation?.guest?.first_name && reservation?.guest?.last_name) {
    updates.guest_name = `${reservation.guest.first_name} ${reservation.guest.last_name}`
  }
  if (reservation?.guest?.email) {
    updates.guest_email = reservation.guest.email
  }
  if (reservation?.guest?.phone) {
    updates.guest_phone = reservation.guest.phone
  }

  return updates
}

/**
 * Map VRBO event to reservation update (similar to Booking)
 */
export function mapVrboEventToUpdate(event: BookingWebhookEvent): ReservationUpdate {
  return mapBookingEventToUpdate(event) // VRBO uses similar format
}

/**
 * Map Flatio event to reservation update (similar to Booking)
 */
export function mapFlatioEventToUpdate(event: BookingWebhookEvent): ReservationUpdate {
  return mapBookingEventToUpdate(event) // Flatio uses similar format
}
