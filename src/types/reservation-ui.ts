import { Reservation, Property, Guest } from './database'

interface ListingData {
  id: string
  properties: Property | Property[]
  platforms?: { display_name: string } | null
}

export interface ReservationUI extends Reservation {
  property_listings: ListingData | ListingData[]
  guests: Guest | Guest[]
}
