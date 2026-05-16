// Database Types - baseado em DATABASE_SCHEMA.md

export type FeeType = 'per_stay' | 'per_night'

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
  slug: string
  base_price: number | null
  currency: string
  description: string | null
  amenities: string[]
  photos: string[] | null
  is_active: boolean
  // Taxas adicionais (opcional — nem todas as queries seleccionam estes campos)
  cleaning_fee?: number | null
  cleaning_fee_type?: FeeType | null
  pet_fee?: number | null
  pet_fee_type?: FeeType | null
  // Horários
  checkin_from?: string | null    // HH:MM
  checkin_until?: string | null   // HH:MM
  checkout_until?: string | null  // HH:MM
  created_at: string
  updated_at: string
}

export type AmenityCategory = 'destaque' | 'sala' | 'quarto' | 'cozinha' | 'banheiro' | 'seguranca' | 'geral'

export type Amenity = {
  id: string
  name: string
  icon: string
  category: AmenityCategory
  sort_order: number
}

export type PropertyAmenity = {
  property_id: string
  amenity_id: string
}

export type BedType = 'single' | 'double' | 'queen' | 'king' | 'sofa_bed' | 'bunk'

export type PropertyRoom = {
  id: string
  property_id: string
  name: string | null
  bed_type: BedType
  bed_count: number
  provides_linen: boolean
  sort_order: number
  created_at: string
}

export type BathroomType = 'wc' | 'full'

export type PropertyBathroom = {
  id: string
  property_id: string
  name: string | null
  bathroom_type: BathroomType
  amenities: string[]
  sort_order: number
  created_at: string
}

export type ReviewSource = 'booking' | 'airbnb' | 'google' | 'tripadvisor' | 'direct' | 'other'

export type PropertyReview = {
  id: string
  organization_id: string
  property_id: string
  source: ReviewSource
  reviewer_name: string
  rating: number
  review_text: string | null
  review_date: string       // ISO date string 'YYYY-MM-DD'
  is_featured: boolean
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
  adults: number
  children: number
  total_amount: number | null
  currency: string
  platform_fee: number | null
  net_amount: number | null
  status: ReservationStatus
  notes: string | null
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

export type PropertyDocument = {
  id: string
  property_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  document_type: string | null
  created_at: string
}

export type ExpenseDocument = {
  id: string
  expense_id: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export type OtaScore = {
  source: ReviewSource
  avg: number        // normalizado para /10
  nativeAvg: number  // média na escala nativa da plataforma
  nativeMax: number  // escala máxima da plataforma (5 ou 10)
  count: number
}

export type ReviewScoreData = {
  globalAvg: number
  totalCount: number
  bySource: OtaScore[]
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

// Supabase Database type for type-safe queries
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: Property
        Insert: Omit<Property, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'created_at' | 'updated_at'>>
      }
      property_reviews: {
        Row: PropertyReview
        Insert: Omit<PropertyReview, 'created_at' | 'updated_at'>
        Update: Partial<Omit<PropertyReview, 'created_at' | 'updated_at'>>
      }
      property_listings: {
        Row: PropertyListing
        Insert: Omit<PropertyListing, 'created_at' | 'updated_at'>
        Update: Partial<Omit<PropertyListing, 'created_at' | 'updated_at'>>
      }
      guests: {
        Row: Guest
        Insert: Omit<Guest, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Guest, 'created_at' | 'updated_at'>>
      }
      reservations: {
        Row: Reservation
        Insert: Omit<Reservation, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Reservation, 'created_at' | 'updated_at'>>
      }
      platforms: {
        Row: Platform
        Insert: Omit<Platform, 'created_at'>
        Update: Partial<Omit<Platform, 'created_at'>>
      }
      calendar_blocks: {
        Row: CalendarBlock
        Insert: Omit<CalendarBlock, 'created_at' | 'updated_at'>
        Update: Partial<Omit<CalendarBlock, 'created_at' | 'updated_at'>>
      }
      sync_logs: {
        Row: SyncLog
      }
      financial_transactions: {
        Row: FinancialTransaction
        Insert: Omit<FinancialTransaction, 'created_at'>
        Update: Partial<Omit<FinancialTransaction, 'created_at'>>
      }
      property_rooms: {
        Row: PropertyRoom
        Insert: Omit<PropertyRoom, 'created_at'>
        Update: Partial<Omit<PropertyRoom, 'created_at'>>
      }
      property_bathrooms: {
        Row: PropertyBathroom
        Insert: Omit<PropertyBathroom, 'created_at'>
        Update: Partial<Omit<PropertyBathroom, 'created_at'>>
      }
      amenities: {
        Row: Amenity
      }
      property_amenities: {
        Row: PropertyAmenity
      }
      property_documents: {
        Row: PropertyDocument
      }
      expense_documents: {
        Row: ExpenseDocument
      }
    }
    Views: {
      unified_calendar_events: {
        Row: UnifiedCalendarEvent
      }
    }
  }
}
