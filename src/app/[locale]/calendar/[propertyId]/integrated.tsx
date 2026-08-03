'use client'

import React, { Suspense, useState } from 'react'
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

// Fallback component for debugging
function CalendarFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-600 font-bold mb-4">⚠️ Error loading calendar component</p>
        <p className="text-gray-600 text-sm">Check browser console for details</p>
      </div>
    </div>
  )
}

export default function IntegratedCalendarPage() {
  const params = useParams()
  const propertyId = params.propertyId as string
  const [hasError, setHasError] = useState(false)

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

  if (hasError) {
    return <CalendarFallback />
  }

  return (
    <Suspense fallback={<CalendarFallback />}>
      <ErrorBoundary onError={() => setHasError(true)}>
        <CalendarWithSettings
          propertyId={propertyId}
          calendarComponent={SimpleCalendarAdapter}
        />
      </ErrorBoundary>
    </Suspense>
  )
}

// Simple Error Boundary
class ErrorBoundary extends React.Component<{
  children: React.ReactNode
  onError: () => void
}> {
  componentDidCatch(error: Error) {
    console.error('CalendarWithSettings error:', error)
    this.props.onError()
  }

  render() {
    return this.props.children
  }
}
