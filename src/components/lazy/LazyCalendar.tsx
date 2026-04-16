'use client'

import dynamic from 'next/dynamic'

const CalendarPageClient = dynamic(
  () => import('@/components/calendar/CalendarPageClient').then(mod => mod.CalendarPageClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    ),
  }
)

export function LazyCalendar() {
  return <CalendarPageClient />
}
