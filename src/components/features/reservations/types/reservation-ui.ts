export interface ReservationUI {
  id: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  total_amount?: number
  total_price?: number
  currency: string
  guest_name?: string
  guest_email?: string
  guest_phone?: string
  adults?: number | null
  children?: number | null
  notes?: string | null
  property_id?: string
  reservation_status?: string
  external_reservation_id?: string
  channel_connection_id?: string
  created_at?: string
  updated_at?: string

  properties?: {
    id: string
    name: string
    city?: string
    country?: string
    currency?: string
  } | null

  property_listings?: {
    id: string
    properties?: {
      id: string
      name: string
      city?: string
      country?: string
      currency?: string
    }
    platforms?: { display_name: string } | null
  } | null

  guests?: {
    first_name: string
    last_name: string
    email?: string
  } | null
}
