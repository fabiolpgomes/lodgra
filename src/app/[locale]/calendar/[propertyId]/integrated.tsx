'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

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
  const propertyId = params.propertyId as string
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Global error handler for this component
    const handleError = (event: ErrorEvent) => {
      console.error('[IntegratedCalendarPage] Error caught:', event.error)
      setError(event.message || 'Unknown error occurred')
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // Debug logging
  console.log('[IntegratedCalendarPage] Rendering with propertyId:', propertyId)

  if (!propertyId) {
    console.warn('[IntegratedCalendarPage] propertyId is missing!')
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

  if (error) {
    console.error('[IntegratedCalendarPage] Rendering error state:', error)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Erro ao Carregar Calendário
          </h1>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <p className="text-sm text-gray-500">
            Tente recarregar a página
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Recarregar
          </button>
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
