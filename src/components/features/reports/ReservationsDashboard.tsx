'use client'

import { useMemo } from 'react'
import { TodaySummary } from './TodaySummary'
import { Next7DaysPipeline } from './Next7DaysPipeline'
import { PerformanceKPIs } from './PerformanceKPIs'

export interface Reservation {
  id: string
  check_in: string
  check_out: string
  status: 'confirmed' | 'pending' | 'cancelled'
  total_amount?: number
  currency?: string
  source?: string
  number_of_guests?: number
  created_at?: string
  platform_fee?: number
  net_amount?: number
  property_listings?: Array<{
    id?: string
    property_id: string
    properties?: Array<{
      id: string
      name: string
      currency: string
      city?: string
    }>
  }>
  guests?: Array<{
    first_name: string
    last_name: string
  }>
}

export interface Property {
  id: string
  name: string
  currency?: string
  is_active?: boolean
}

interface ReservationsDashboardProps {
  _reservations: Reservation[]
  futureReservations: Reservation[]
  properties: Property[]
  _startDate: string
  _endDate: string
  propertyId?: string
}

export function ReservationsDashboard({
  _reservations,
  futureReservations,
  properties,
  _startDate,
  _endDate,
  propertyId,
}: ReservationsDashboardProps) {
  const today = useMemo(() => {
    const t = new Date()
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0, 0))
  }, [])

  const nextSevenDays = useMemo(() => {
    const t = new Date(today)
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 7, 0, 0, 0, 0))
  }, [today])

  const sevenDayReservations = useMemo(() => {
    return (futureReservations || []).filter((r) => {
      const checkInParts = r.check_in.split('T')[0].split('-')
      const checkIn = new Date(Date.UTC(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2])))
      return checkIn >= today && checkIn <= nextSevenDays && r.status === 'confirmed'
    })
  }, [futureReservations, today, nextSevenDays])

  const todaysReservations = useMemo(() => {
    const t = new Date(today)
    const tomorrowStart = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1, 0, 0, 0, 0))

    return sevenDayReservations.filter((r) => {
      const checkInParts = r.check_in.split('T')[0].split('-')
      const checkIn = new Date(Date.UTC(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2])))

      const checkOutParts = r.check_out.split('T')[0].split('-')
      const checkOut = new Date(Date.UTC(parseInt(checkOutParts[0]), parseInt(checkOutParts[1]) - 1, parseInt(checkOutParts[2])))

      return (
        (checkIn >= today && checkIn < tomorrowStart) ||
        (checkOut > today && checkOut <= tomorrowStart)
      )
    })
  }, [sevenDayReservations, today])

  const metrics = useMemo(() => {
    const periodicReservations = sevenDayReservations || []
    const periodicProperties = propertyId
      ? properties.filter((p) => p.id === propertyId)
      : properties

    let totalBookedNights = 0
    let totalAvailableNights = 0
    let totalRevenue = 0
    const reservationCount = periodicReservations.length

    const daysDiff = Math.ceil(
      (nextSevenDays.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    totalAvailableNights = daysDiff * periodicProperties.length

    periodicReservations.forEach((r) => {
      const checkInParts = r.check_in.split('T')[0].split('-')
      const checkIn = new Date(Date.UTC(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2])))

      const checkOutParts = r.check_out.split('T')[0].split('-')
      const checkOut = new Date(Date.UTC(parseInt(checkOutParts[0]), parseInt(checkOutParts[1]) - 1, parseInt(checkOutParts[2])))

      const windowStart = checkIn < today ? today : checkIn
      const windowEnd = checkOut > nextSevenDays ? nextSevenDays : checkOut

      const nights = Math.ceil(
        (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)
      )
      totalBookedNights += nights
      totalRevenue += r.total_amount || 0
    })

    const occupancyRate =
      totalAvailableNights > 0
        ? Math.min((totalBookedNights / totalAvailableNights) * 100, 100)
        : 0

    const adr = totalBookedNights > 0 ? totalRevenue / totalBookedNights : 0

    return {
      occupancyRate,
      adr,
      revenue: totalRevenue,
      reservationCount,
      bookedNights: totalBookedNights,
      availableNights: totalAvailableNights,
    }
  }, [sevenDayReservations, propertyId, properties, today, nextSevenDays])

  return (
    <div className="space-y-8">
      <TodaySummary
        todaysReservations={todaysReservations}
        properties={properties}
        propertyId={propertyId}
      />

      <Next7DaysPipeline
        reservations={sevenDayReservations}
        properties={properties}
        propertyId={propertyId}
        startDate={today.toISOString().split('T')[0]}
        _endDate={nextSevenDays.toISOString().split('T')[0]}
      />

      <PerformanceKPIs
        metrics={metrics}
        reservations={sevenDayReservations}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextSevenDays.toISOString().split('T')[0]}
      />
    </div>
  )
}
