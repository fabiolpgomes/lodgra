// Database Types - baseado em DATABASE_SCHEMA.md

export type Property = {
  id: string
  name: string
  address: string
  city: string | null
  country: string | null
  postal_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  max_guests: number | null
  property_type: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Platform = {
  id: string
  name: string
  code: string
  api_endpoint: string | null
  requires_oauth: boolean
  is_active: boolean
  created_at: string
}

export type PropertyListing = {
  id: string
  property_id: string
  platform_id: string
  external_listing_id: string
  listing_url: string | null
  sync_enabled: boolean
  last_synced_at: string | null
  ical_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Guest = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  total_bookings: number
  created_at: string
  updated_at: string
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type Reservation = {
  id: string
  property_listing_id: string
  guest_id: string | null
  external_reservation_id: string | null
  check_in: string
  check_out: string
  number_of_guests: number | null
  total_amount: number | null
  currency: string
  platform_fee: number | null
  net_amount: number | null
  status: ReservationStatus
  synced_at: string | null
  source: string | null
  created_at: string
  updated_at: string
}

export type CalendarBlock = {
  id: string
  property_id: string
  start_date: string
  end_date: string
  block_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type SyncLog = {
  id: string
  property_listing_id: string
  sync_type: string
  direction: 'inbound' | 'outbound'
  status: 'success' | 'error' | 'partial'
  error_message: string | null
  records_processed: number | null
  records_created: number | null
  records_updated: number | null
  records_failed: number | null
  synced_at: string
}

export type TransactionType = 'income' | 'expense'

export type FinancialTransaction = {
  id: string
  property_id: string
  reservation_id: string | null
  transaction_type: TransactionType
  category: string
  amount: number
  currency: string
  description: string | null
  transaction_date: string
  created_at: string
}

// Views
export type UnifiedCalendarEvent = {
  property_id: string
  property_name: string
  check_in: string
  check_out: string
  type: 'reservation' | 'block'
  guest_name: string | null
  status: string
  platform_id: string | null
}

// Tipos compostos para uso na UI
export type PropertyWithListings = Property & {
  listings: PropertyListing[]
}

export type ReservationWithDetails = Reservation & {
  guest: Guest | null
  property_listing: PropertyListing & {
    property: Property
    platform: Platform
  }
}
