'use client'

import { useRouter } from '@/lib/i18n/routing'
import { useState } from 'react'

export function QuickActionButtons({ propertyId }: { propertyId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleNewReservation = async () => {
    setIsLoading('reservation')
    try {
      router.push(`/reservations/new?property_id=${propertyId}`)
    } finally {
      setIsLoading(null)
    }
  }

  const handleViewCalendar = async () => {
    setIsLoading('calendar')
    try {
      router.push(`/calendar?property_id=${propertyId}`)
    } finally {
      setIsLoading(null)
    }
  }

  const handleSyncListings = async () => {
    setIsLoading('sync')
    try {
      router.push(`/sync?property_id=${propertyId}`)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleNewReservation}
        disabled={isLoading !== null}
        className="w-full px-4 py-3 bg-brand-blue text-white rounded-sm hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        {isLoading === 'reservation' ? 'Carregando...' : 'Nova Reserva'}
      </button>
      <button
        onClick={handleViewCalendar}
        disabled={isLoading !== null}
        className="w-full px-4 py-3 bg-brand-surface-soft text-brand-text-dark rounded-sm border border-brand-border hover:bg-brand-surface-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        {isLoading === 'calendar' ? 'Carregando...' : 'Ver Calendário'}
      </button>
      <button
        onClick={handleSyncListings}
        disabled={isLoading !== null}
        className="w-full px-4 py-3 bg-brand-blue/10 text-brand-blue rounded-sm border border-brand-blue/20 hover:bg-brand-blue/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
      >
        {isLoading === 'sync' ? 'Sincronizando...' : 'Sincronizar Plataformas'}
      </button>
    </div>
  )
}
