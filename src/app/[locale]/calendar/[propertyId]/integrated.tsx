'use client'

import { useParams, useRouter } from 'next/navigation'
import { CalendarKanbanView } from '@/components/calendar/CalendarKanbanView'
import { useEffect, useState } from 'react'

interface Reservation {
  id: string
  propertyId: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  currency?: string
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

/**
 * INTEGRATED CALENDAR PAGE - Airbnb Style
 * Displays property calendar with photos, reservations, and settings
 */
export default function IntegratedCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.propertyId as string
  const locale = (params.locale as string) || 'pt-BR'

  const [properties, setProperties] = useState<Property[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Debug: Log when this page loads (property-specific view)
  useEffect(() => {
    console.log('[PropertyCalendarPage] PROPERTY VIEW LOADED', { propertyId, locale })
  }, [propertyId, locale])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [propsRes, reservRes] = await Promise.all([
          fetch('/api/properties?status=active'),
          fetch('/api/calendar/reservations'),
        ])

        if (propsRes.ok) {
          const propsData = await propsRes.json()
          const props = propsData.data?.properties || propsData.properties || []
          const mappedProps = props.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: p.bedrooms ? `${p.bedrooms} dorms` : 'Property',
            location: p.city || p.country || '',
            imageUrl: p.image,
          }))
          setProperties(mappedProps)
        }

        if (reservRes.ok) {
          const reservData = await reservRes.json()
          const events = Array.isArray(reservData) ? reservData : (reservData.data || [])

          const mappedReserv = events.map((evt: any) => {
            const startStr = evt.start.split('T')[0]
            const endStr = evt.end.split('T')[0]
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
              currency: evt.extendedProps?.currency || 'EUR',
              status: evt.extendedProps?.status || 'confirmed',
            }
          })
          setReservations(mappedReserv)
        }
      } catch (error) {
        console.error('Error fetching calendar data:', error)
        setProperties([])
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [propertyId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Carregando calendário...</p>
        </div>
      </div>
    )
  }

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Propriedade não encontrada</h1>
          <p className="text-gray-600">Por favor, selecione uma propriedade no menu</p>
        </div>
      </div>
    )
  }

  return (
    <CalendarKanbanView
      properties={properties}
      reservations={reservations}
      selectedPropertyId={propertyId}
      onPropertyClick={(id) => {
        router.push(`/${locale}/calendar/${id}`)
      }}
    />
  )
}
