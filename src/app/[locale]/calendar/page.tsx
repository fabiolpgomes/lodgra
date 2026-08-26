'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CalendarListView } from '@/components/calendar/CalendarListView'
import { CalendarKanbanView } from '@/components/calendar/CalendarKanbanView'
import '@/styles/calendar-kanban.css'

// Default empty array - will be populated from API
const DEFAULT_PROPERTIES: any[] = []

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()
  const [properties, setProperties] = useState(DEFAULT_PROPERTIES)
  const [reservations, setReservations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true // default to desktop on SSR
  })

  // Fetch properties and reservations from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [propsRes, reservRes] = await Promise.all([
          fetch('/api/properties?status=active', { credentials: 'include' }),
          fetch('/api/calendar/reservations', { credentials: 'include' }),
        ])

        if (propsRes.ok) {
          const propsData = await propsRes.json()
          const props = propsData.data?.properties || propsData.properties || []
          // Map API response to component interface
          const mappedProps = props.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.bedrooms ? `${p.bedrooms} dorms` : 'Property',
            location: p.city || p.country || '',
            imageUrl: p.image, // Map 'image' to 'imageUrl'
          }))
          setProperties(mappedProps)
        }

        if (reservRes.ok) {
          const reservData = await reservRes.json()
          // API returns array of events directly or nested in .data
          const events = Array.isArray(reservData) ? reservData : (reservData.data || [])

          // Debug: Log raw API response
          console.debug('[CalendarPage] RAW API Events:', events.slice(0, 3).map((e: any) => ({
            id: e.id,
            start: e.start,
            end: e.end,
            guest: e.extendedProps?.guest_name,
          })))

          // Map FullCalendar events to our Reservation format
          const mappedReserv = events.map((evt: any) => {
            // Parse dates as UTC to avoid timezone mismatch
            const startStr = evt.start.split('T')[0] // "2026-05-08"
            const endStr = evt.end.split('T')[0] // "2026-05-09"
            const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
            const [endYear, endMonth, endDay] = endStr.split('-').map(Number)

            return {
              id: evt.id,
              propertyId: evt.extendedProps?.property_id || '',
              guestName: evt.extendedProps?.guest_name || 'Hóspede',
              guestCount: evt.extendedProps?.number_of_guests || 1,
              startDate: new Date(Date.UTC(startYear, startMonth - 1, startDay)),
              endDate: new Date(Date.UTC(endYear, endMonth - 1, endDay)),
              price: evt.extendedProps?.total_amount || 0,
              currency: evt.extendedProps?.currency?.toUpperCase() || null,
              status: evt.extendedProps?.status || 'confirmed',
              notes: evt.extendedProps?.notes || null,
            }
          })
          setReservations(mappedReserv)

          // Debug logging - detailed
          if (process.env.NODE_ENV === 'development') {
            console.debug('[CalendarPage] Mapped Reservations (sample):', {
              sample: mappedReserv[0] ? {
                id: mappedReserv[0].id,
                guest: mappedReserv[0].guestName,
                startDate: mappedReserv[0].startDate.toISOString(),
                startDate_getTime: mappedReserv[0].startDate.getTime(),
                utcString: mappedReserv[0].startDate.toUTCString(),
              } : null,
            })
          }
        } else {
          console.error('[CalendarPage] Reservations fetch failed:', {
            status: reservRes.status,
            statusText: reservRes.statusText,
          })
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        // Fallback to empty state
        setProperties([])
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update on mount to catch client-side width
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setIsDesktop(window.innerWidth >= 1024)
      }
      window.addEventListener('resize', handleResize)
      setIsDesktop(window.innerWidth >= 1024)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handlePropertyClick = (propertyId: string) => {
    router.push(`/${locale}/calendar/${propertyId}`)
  }

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#FBFAF6] px-4 text-sm text-[#4D5566] sm:text-base"
      >
        Carregando calendário...
      </div>
    )
  }

  return isDesktop ? (
    <CalendarKanbanView
      properties={properties}
      reservations={reservations}
      selectedPropertyId={selectedPropertyId}
      onPropertyClick={handlePropertyClick}
    />
  ) : (
    <CalendarListView
      properties={properties}
      reservations={reservations}
      onPropertySelect={handlePropertyClick}
    />
  )
}
