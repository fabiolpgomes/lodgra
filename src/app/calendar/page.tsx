'use client'

import { useState } from 'react'
import { DesktopCalendarLayout } from '@/components/calendar/DesktopCalendarLayout'

// Mock data - replace with actual API calls
const mockProperties = [
  {
    id: 'prop-1',
    name: 'AHS Studio Premium Bela Vista',
    type: 'Studio',
    location: 'Bela Vista',
    imageUrl: '/properties/studio-bela-vista.jpg',
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
    imageUrl: '/properties/casa-moinho.jpg',
    availabilityDots: [
      false, true, true, true, true, true, true,
      true, true, true, true, true, false, true,
      true, true, true, false, true, true, true,
    ],
    calendarDays: [],
  },
]

export default function CalendarPage() {
  return (
    <div className="h-screen w-screen bg-white">
      <DesktopCalendarLayout
        properties={mockProperties}
        initialPropertyId="prop-1"
      />
    </div>
  )
}
