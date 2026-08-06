'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

interface DailyPrice {
  date: string
  base_price: number
}

interface Reservation {
  id: string
  guest_name: string
  guest_count?: number
  start_date: string
  end_date: string
  price_per_night: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface ReservationsResponse {
  data: Reservation[]
}

interface PricingData {
  base_price: number
  weekend_price?: number | null
}

const STALE_TIME = 1000 * 60 * 5 // 5 minutes
const CACHE_TIME = 1000 * 60 * 10 // 10 minutes

export function useDailyPrices(propertyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['dailyPrices', propertyId, year, month],
    queryFn: async () => {
      const response = await fetch(
        `/api/properties/${propertyId}/daily-prices`,
        { credentials: 'include' }
      )
      if (!response.ok) throw new Error('Failed to fetch prices')
      return (await response.json()) as DailyPrice[]
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useReservations(propertyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['reservations', propertyId, year, month],
    queryFn: async () => {
      try {
        const url = `/api/properties/${propertyId}/reservations`
        console.log(`[useReservations] Fetching from: ${url}`)

        const response = await fetch(url, { credentials: 'include' })

        console.log(`[useReservations] Response status: ${response.status}`)

        if (!response.ok) {
          const text = await response.text()
          console.error(`[ERROR] Reservations API returned ${response.status}:`, text)
          return { data: [] }
        }

        const data = await response.json() as ReservationsResponse
        console.log(`[useReservations] SUCCESS - Got ${data.data?.length || 0} reservations`)
        return data
      } catch (error) {
        console.error(`[ERROR] useReservations exception:`, error)
        return { data: [] }
      }
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function usePropertyPricing(propertyId: string) {
  return useQuery({
    queryKey: ['pricing', propertyId],
    queryFn: async () => {
      const response = await fetch(
        `/api/properties/${propertyId}/pricing`,
        { credentials: 'include' }
      )
      if (!response.ok) throw new Error('Failed to fetch pricing')
      return (await response.json()).data as PricingData
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
  })
}

export function useInvalidateCalendarQueries() {
  const queryClient = useQueryClient()
  return (propertyId: string, year: number, month: number) => {
    queryClient.invalidateQueries({
      queryKey: ['dailyPrices', propertyId, year, month],
    })
    queryClient.invalidateQueries({
      queryKey: ['reservations', propertyId, year, month],
    })
  }
}
