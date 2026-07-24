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
          fetch('/api/properties?status=active'),
          fetch('/api/calendar/reservations'),
        ])

        if (propsRes.ok) {
          const propsData = await propsRes.json()
          setProperties(propsData.properties || propsData || [])
        }

        if (reservRes.ok) {
          const reservData = await reservRes.json()
          setReservations(reservData.reservations || reservData || [])
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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#fbfaf6',
          fontSize: '16px',
          color: '#4d5566',
        }}
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
      onPropertySelect={handlePropertyClick}
    />
  )
}
