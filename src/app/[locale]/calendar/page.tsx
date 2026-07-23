'use client'

import { useState } from 'react'
import { DesktopCalendarLayout } from '@/components/calendar/DesktopCalendarLayout'
import '@/styles/mobile-calendar.css'

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
  return (
    <div className="h-screen w-screen bg-white">
      <DesktopCalendarLayout
        properties={mockProperties}
        initialPropertyId="prop-1"
      />
    </div>
  )
}
