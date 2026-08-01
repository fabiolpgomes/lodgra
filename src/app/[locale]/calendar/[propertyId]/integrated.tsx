'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'
import { useParams } from 'next/navigation'

/**
 * INTEGRATED CALENDAR PAGE (Phase 2)
 * Uses CalendarWithSettings wrapper for full Epic 43 implementation
 *
 * This is the production version combining:
 * - Simple Calendar (day-click interface)
 * - 5 Settings Cards (Preços, Descontos, Disponibilidade, Cancelamentos, Taxas)
 * - Day Click Modal (Price/Block interaction)
 * - Mobile-first responsive layout
 *
 * Usage:
 * Deploy this component to replace the old calendar page
 * Or use as A/B test variant
 */
export default function IntegratedCalendarPage() {
  const params = useParams()
  const propertyId = params.id as string

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
    <div className="w-full h-screen bg-white">
      <CalendarWithSettings
        propertyId={propertyId}
        calendarComponent={SimpleCalendarAdapter}
      />
    </div>
  )
}
