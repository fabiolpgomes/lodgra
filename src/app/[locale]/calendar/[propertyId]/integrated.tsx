'use client'

import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'
import { PropertySelector } from '@/components/calendar/PropertySelector'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronRight, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Property {
  name: string
}

/**
 * INTEGRATED CALENDAR PAGE (Phase 2)
 * Uses CalendarWithSettings wrapper for full Epic 43 implementation
 *
 * This is the production version combining:
 * - Simple Calendar (day-click interface)
 * - 5 Settings Cards (Preços, Descontos, Disponibilidade, Cancelamentos, Taxas)
 * - Day Click Modal (Price/Block interaction)
 * - Mobile-first responsive layout
 * - Property Selector for multi-property navigation
 * - Breadcrumb navigation
 *
 * Usage:
 * Deploy this component to replace the old calendar page
 * Or use as A/B test variant
 */
export default function IntegratedCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const propertyId = params.propertyId as string
  const [property, setProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!propertyId) return

    const fetchProperty = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('properties')
          .select('name')
          .eq('id', propertyId)
          .single()

        setProperty(data)
      } catch (error) {
        console.error('Erro ao buscar propriedade:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperty()
  }, [propertyId])

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
    <div className="space-y-6">
      {/* Breadcrumb + Property Selector */}
      <div className="flex items-center justify-between px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="hover:text-gray-900 transition-colors"
          >
            Dashboard
          </button>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => router.push(`/${locale}/calendar`)}
            className="hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            <Calendar className="w-4 h-4" />
            Calendários
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">
            {isLoading ? 'Carregando...' : property?.name || 'Calendário'}
          </span>
        </div>

        {/* Property Selector */}
        <PropertySelector currentPropertyId={propertyId} />
      </div>

      {/* Calendar */}
      <CalendarWithSettings
        propertyId={propertyId}
        calendarComponent={SimpleCalendarAdapter}
      />
    </div>
  )
}
