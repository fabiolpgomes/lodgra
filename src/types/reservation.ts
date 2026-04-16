export interface Reservation {
  id: string
  check_in: string
  check_out: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  total_amount: number
  currency: string

  property_listings: {
    id: string
    properties: {
      id: string
      name: string
      city?: string
      country?: string
    }[]
  }[]

  guests: {
    first_name: string
    last_name: string
    email?: string
  }[]
}
