'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'
import { useParams } from 'next/navigation'

/**
 * INTEGRATED CALENDAR PAGE - Production Version
 * Uses CalendarWithSettings wrapper for complete implementation
 *
 * This combines:
 * - Simple Calendar (day-click interface for pricing)
 * - 5 Settings Cards (Preços, Descontos, Disponibilidade, Cancelamentos, Taxas)
 * - Day Click Modal (Price/Block interaction)
 * - Mobile-first responsive layout
 */
export default function IntegratedCalendarPage() {
  const params = useParams()
  const propertyId = params.propertyId as string

  if (!propertyId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Propriedade não encontrada
          </h1>
          <p className="text-gray-600">
            Por favor, selecione uma propriedade no menu
          </p>
        </div>
      </div>
    )
  }

  return (
    <CalendarWithSettings
      propertyId={propertyId}
      calendarComponent={SimpleCalendarAdapter}
    />
  )
}
