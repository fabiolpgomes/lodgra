'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'

interface DailyPrice {
  date: string
  base_price: number
  weekend_price?: number | null
  final_price: number
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

interface BlockedDate {
  id: string
  start_date: string
  end_date: string
  notes: string | null
  block_type: string
  created_at: string
}

interface BlockedDatesResponse {
  success: boolean
  data: BlockedDate[]
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
        const response = await fetch(
          `/api/properties/${propertyId}/reservations`,
          { credentials: 'include' }
        )

        if (!response.ok) {
          console.warn(`[WARN] Reservations API returned ${response.status}`)
          return { data: [] }
        }

        return (await response.json()) as ReservationsResponse
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

export function useBlockedDates(propertyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['blockedDates', propertyId, year, month],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/properties/${propertyId}/calendar/blocked-dates?year=${year}&month=${month}`,
          { credentials: 'include' }
        )

        if (!response.ok) {
          console.warn(`[WARN] Blocked dates API returned ${response.status}`)
          return { success: true, data: [] }
        }

        return (await response.json()) as BlockedDatesResponse
      } catch (error) {
        console.error(`[ERROR] useBlockedDates exception:`, error)
        return { success: true, data: [] }
      }
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
    queryClient.invalidateQueries({
      queryKey: ['blockedDates', propertyId, year, month],
    })
  }
}
