'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CalendarListView } from '@/components/calendar/CalendarListView'
import { CalendarKanbanView } from '@/components/calendar/CalendarKanbanView'
import '@/styles/calendar-kanban.css'

// Mock data - replace with actual API calls
const mockProperties = [
  {
    id: 'prop-1',
    name: 'AHS Studio Premium Bela Vista',
    type: 'Studio',
    location: 'Bela Vista',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23e0e0e0" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EStudio%3C/text%3E%3C/svg%3E',
    availabilityDots: [
      true, true, true, true, true, true, false,
      true, true, true, false, true, true, true,
      false, true, true, true, true, true, true,
    ],
    calendarDays: [
      {
        date: new Date(2026, 6, 1),
        price: 149,
        isWeekend: false,
        isToday: false,
      },
      {
        date: new Date(2026, 6, 2),
        price: 149,
        isWeekend: true,
        isToday: false,
      },
      {
        date: new Date(2026, 6, 3),
        price: 157,
        isWeekend: true,
        isToday: false,
      },
      {
        date: new Date(2026, 7, 21),
        price: 149,
        isWeekend: false,
        isToday: true,
      },
      {
        date: new Date(2026, 7, 22),
        price: 149,
        isWeekend: true,
        isBooked: true,
        guestName: 'Mark Tosan',
        isToday: false,
      },
    ],
  },
  {
    id: 'prop-2',
    name: 'AHS - Casa do Moinho Refúgio na Natureza',
    type: 'T2',
    location: 'Loulé',
    imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect fill="%23d0d0d0" width="160" height="160"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3ECasa%3C/text%3E%3C/svg%3E',
    availabilityDots: [
      false, true, true, true, true, true, true,
      true, true, true, true, true, false, true,
      true, true, true, false, true, true, true,
    ],
    calendarDays: [],
  },
]

export default function CalendarPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true // default to desktop on SSR
  })

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

  return isDesktop ? (
    <CalendarKanbanView
      properties={mockProperties}
      reservations={[]}
      selectedPropertyId={selectedPropertyId}
      onPropertyClick={handlePropertyClick}
    />
  ) : (
    <CalendarListView
      properties={mockProperties}
      onPropertySelect={handlePropertyClick}
    />
  )
}
