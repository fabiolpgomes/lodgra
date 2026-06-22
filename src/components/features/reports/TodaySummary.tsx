'use client'

import { useMemo, useState } from 'react'
import { Calendar, Home, LogIn, LogOut, ChevronDown } from 'lucide-react'

export interface Reservation {
  id: string
  check_in: string
  check_out: string
  status: 'confirmed' | 'pending' | 'cancelled'
  property_listings?: Array<{
    properties?: Array<{
      id: string
      name: string
    }>
  }>
  guests?: Array<{
    first_name: string
    last_name: string
  }>
}

export interface Property {
  id: string
  name: string
}

interface TodaySummaryProps {
  todaysReservations: Reservation[]
  properties: Property[]
  propertyId?: string
}

export function TodaySummary({
  todaysReservations,
  properties,
  propertyId,
}: TodaySummaryProps) {
  const [expandedCheckIns, setExpandedCheckIns] = useState(false)
  const [expandedCheckOuts, setExpandedCheckOuts] = useState(false)

  const today = useMemo(() => {
    // Use UTC date, not local browser timezone
    const t = new Date()
    const utcDate = new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0, 0)
    return utcDate
  }, [])

  const todayStr = useMemo(() => {
    // Format as YYYY-MM-DD in UTC
    const year = today.getUTCFullYear()
    const month = String(today.getUTCMonth() + 1).padStart(2, '0')
    const date = String(today.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }, [today])

  const summary = useMemo(() => {
    const periodicProperties = propertyId
      ? properties.filter((p) => p.id === propertyId)
      : properties

    const totalProperties = periodicProperties.length
    let occupiedProperties = 0

    const checkIns: Reservation[] = []
    const checkOuts: Reservation[] = []

    const occupiedIds = new Set<string>()

    todaysReservations.forEach((r) => {
      // Parse check-in/check-out as UTC dates
      const checkInParts = r.check_in.split('T')[0].split('-')
      const checkIn = new Date(Date.UTC(parseInt(checkInParts[0]), parseInt(checkInParts[1]) - 1, parseInt(checkInParts[2])))

      const checkOutParts = r.check_out.split('T')[0].split('-')
      const checkOut = new Date(Date.UTC(parseInt(checkOutParts[0]), parseInt(checkOutParts[1]) - 1, parseInt(checkOutParts[2])))

      const today_0 = new Date(today)
      const tomorrow_0 = new Date(today)
      tomorrow_0.setUTCDate(tomorrow_0.getUTCDate() + 1)

      if (checkIn.getTime() === today_0.getTime()) {
        checkIns.push(r)
      }

      if (checkOut.getTime() === today_0.getTime()) {
        checkOuts.push(r)
      }

      if (
        (checkIn < tomorrow_0 && checkOut > today_0) ||
        (checkIn.getTime() === today_0.getTime())
      ) {
        occupiedIds.add(r.property_listings?.[0]?.properties?.[0]?.id || '')
      }
    })

    occupiedProperties = occupiedIds.size

    const availableProperties = Math.max(0, totalProperties - occupiedProperties)

    let statusColor = 'bg-red-50 border-red-200'
    let statusLabel = 'Baixa Ocupação'
    let statusPercent = 0

    if (totalProperties > 0) {
      statusPercent = (occupiedProperties / totalProperties) * 100
      if (statusPercent === 100) {
        statusColor = 'bg-green-50 border-green-200'
        statusLabel = 'Lotado'
      } else if (statusPercent >= 50) {
        statusColor = 'bg-yellow-50 border-yellow-200'
        statusLabel = 'Boa Ocupação'
      }
    }

    return {
      totalProperties,
      occupiedProperties,
      availableProperties,
      checkIns,
      checkOuts,
      statusColor,
      statusLabel,
      statusPercent: Math.round(statusPercent),
    }
  }, [todaysReservations, properties, propertyId, today])

  const getGuestName = (r: Reservation) => {
    if (Array.isArray(r.guests) && r.guests.length > 0 && 'first_name' in r.guests[0]) {
      return `${r.guests[0].first_name} ${r.guests[0].last_name || ''}`
    }
    return 'Hóspede'
  }

  const getPropertyName = (r: Reservation) => {
    return r.property_listings?.[0]?.properties?.[0]?.name || 'Propriedade'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <Calendar className="h-5 w-5" />
        Hoje ({todayStr})
      </h2>

      <div className={`mb-6 rounded-lg border p-4 ${summary.statusColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Status de Ocupação</p>
            <p className="text-2xl font-bold">{summary.statusLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{summary.statusPercent}%</p>
            <p className="text-sm text-gray-600">
              {summary.occupiedProperties}/{summary.totalProperties} propriedades
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <Home className="h-4 w-4" />
            Disponíveis
          </div>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.availableProperties}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <Home className="h-4 w-4" />
            Ocupadas
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {summary.occupiedProperties}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={() => setExpandedCheckIns(!expandedCheckIns)}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50"
        >
          <LogIn className="h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Check-ins Hoje</p>
            <p className="text-xs text-gray-500">{summary.checkIns.length} reserva(s)</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expandedCheckIns ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedCheckIns && (
          <div className="space-y-2 pl-8">
            {summary.checkIns.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum check-in hoje</p>
            ) : (
              summary.checkIns.map((r) => (
                <div key={r.id} className="border-l-2 border-blue-300 py-2 pl-3 text-sm">
                  <p className="font-semibold">{getGuestName(r)}</p>
                  <p className="text-xs text-gray-600">{getPropertyName(r)}</p>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setExpandedCheckOuts(!expandedCheckOuts)}
          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Check-outs Hoje</p>
            <p className="text-xs text-gray-500">{summary.checkOuts.length} reserva(s)</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${expandedCheckOuts ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedCheckOuts && (
          <div className="space-y-2 pl-8">
            {summary.checkOuts.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum check-out hoje</p>
            ) : (
              summary.checkOuts.map((r) => (
                <div key={r.id} className="border-l-2 border-orange-300 py-2 pl-3 text-sm">
                  <p className="font-semibold">{getGuestName(r)}</p>
                  <p className="text-xs text-gray-600">{getPropertyName(r)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
