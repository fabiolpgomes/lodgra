'use client'

import { useRouter } from 'next/navigation'
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
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
      >
        {isLoading === 'reservation' ? 'Carregando...' : 'Nova Reserva'}
      </button>
      <button
        onClick={handleViewCalendar}
        disabled={isLoading !== null}
        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
      >
        {isLoading === 'calendar' ? 'Carregando...' : 'Ver Calendário'}
      </button>
      <button
        onClick={handleSyncListings}
        disabled={isLoading !== null}
        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
      >
        {isLoading === 'sync' ? 'Sincronizando...' : 'Sincronizar Plataformas'}
      </button>
    </div>
  )
}
