'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getISOWeekNumber, getISOWeekStartDate, getWeekDays } from '@/utils/weekUtils'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

interface Reservation {
  id: string
  propertyId: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  currency?: string
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface CalendarKanbanViewProps {
  properties: Property[]
  reservations: Reservation[]
  selectedPropertyId?: string
  onPropertyClick?: (propertyId: string) => void
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const DAYS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmed: {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
  },
  hosting: {
    bg: 'bg-green-50',
    text: 'text-green-900',
    border: 'border-green-200',
  },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
  },
  completed: {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    border: 'border-gray-200',
  },
}

export function CalendarKanbanView({
  properties,
  reservations,
  selectedPropertyId,
  onPropertyClick,
}: CalendarKanbanViewProps) {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const now = new Date()
  const todayWeekNumber = getISOWeekNumber(now)
  const currentYear = now.getFullYear()

  const [currentWeek, setCurrentWeek] = useState(todayWeekNumber)

  // Calculate year for week
  const getYearForWeek = (year: number, week: number): number => {
    if (week >= 49) {
      const jan1 = new Date(Date.UTC(year + 1, 0, 1))
      const jan1Week = getISOWeekNumber(jan1)
      if (jan1Week <= 4) return year + 1
    } else if (week <= 4) {
      const dec31 = new Date(Date.UTC(year - 1, 11, 31))
      const dec31Week = getISOWeekNumber(dec31)
      if (dec31Week >= 49) return year - 1
    }
    return year
  }

  const weekYear = getYearForWeek(currentYear, currentWeek)

  // Get 14 days (2 weeks)
  const weekStartDate = getISOWeekStartDate(weekYear, currentWeek)
  const weekDays1 = getWeekDays(weekStartDate).map(day => {
    const normalized = new Date(day)
    normalized.setUTCHours(0, 0, 0, 0)
    return normalized
  })

  const nextWeek = currentWeek === 53 ? 1 : currentWeek + 1
  const nextWeekYear = currentWeek === 53 ? weekYear + 1 : weekYear
  const week2StartDate = getISOWeekStartDate(nextWeekYear, nextWeek)
  const weekDays2 = getWeekDays(week2StartDate).map(day => {
    const normalized = new Date(day)
    normalized.setUTCHours(0, 0, 0, 0)
    return normalized
  })

  const allDays = [...weekDays1, ...weekDays2]

  // Get reservations for each property and day
  const getReservationsForDay = (propertyId: string, day: Date): Reservation[] => {
    return reservations.filter(res => {
      if (res.propertyId !== propertyId) return false

      const startDate = new Date(Date.UTC(
        res.startDate.getUTCFullYear(),
        res.startDate.getUTCMonth(),
        res.startDate.getUTCDate()
      ))
      const endDate = new Date(Date.UTC(
        res.endDate.getUTCFullYear(),
        res.endDate.getUTCMonth(),
        res.endDate.getUTCDate()
      ))

      return day >= startDate && day < endDate
    })
  }

  const propertiesWithReservations = properties.slice(0, 7)
  const monthDisplay = MONTHS[weekStartDate.getMonth()]
  const year = weekStartDate.getFullYear()

  const handlePrevWeek = () => {
    setCurrentWeek(prev => (prev === 1 ? 53 : prev - 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => (prev === 53 ? 1 : prev + 1))
  }

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      'EUR': '€',
      'BRL': 'R$',
      'USD': '$',
    }
    return symbols[currency] || currency
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      hosting: 'Hospedado',
      pending: 'Pendente',
      completed: 'Concluído',
    }
    return labels[status] || status
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            ← Dashboard
          </button>
          <div className="flex items-center gap-4">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center min-w-[200px]">
              <div className="text-sm text-gray-600">{monthDisplay} de {year}</div>
              <div className="text-xl font-semibold">Semana {currentWeek}</div>
            </div>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="text-sm text-gray-600">{propertiesWithReservations.length} Propriedades</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Days Header */}
          <div className="flex bg-gray-50 border-b border-gray-200">
            <div className="w-48 flex-shrink-0 border-r border-gray-200 p-4 font-semibold text-sm">
              Propriedade
            </div>
            <div className="flex flex-1">
              {allDays.map((day, idx) => {
                const dayName = DAYS_PT[day.getUTCDay()]
                const dayNum = day.getUTCDate()
                const isToday =
                  day.getUTCDate() === now.getUTCDate() &&
                  day.getUTCMonth() === now.getUTCMonth() &&
                  day.getUTCFullYear() === now.getUTCFullYear()

                return (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[140px] p-3 text-center border-r border-gray-200 ${
                      isToday ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-600">{dayName}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dayNum}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rows for each property */}
          {propertiesWithReservations.map((property) => (
            <div key={property.id} className="flex border-b border-gray-200">
              {/* Property name */}
              <div className="w-48 flex-shrink-0 border-r border-gray-200 p-4 bg-gray-50">
                <div
                  className="cursor-pointer hover:text-blue-600"
                  onClick={() => onPropertyClick?.(property.id)}
                >
                  <div className="font-semibold text-sm line-clamp-2">{property.name}</div>
                  <div className="text-xs text-gray-600">{property.type}</div>
                </div>
              </div>

              {/* Days cells */}
              <div className="flex flex-1">
                {allDays.map((day, idx) => {
                  const dayReservations = getReservationsForDay(property.id, day)
                  const isToday =
                    day.getUTCDate() === now.getUTCDate() &&
                    day.getUTCMonth() === now.getUTCMonth() &&
                    day.getUTCFullYear() === now.getUTCFullYear()

                  return (
                    <div
                      key={`${property.id}-${idx}`}
                      className={`flex-1 min-w-[140px] p-2 border-r border-gray-200 ${
                        isToday ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="space-y-2 min-h-[120px]">
                        {dayReservations.map((res) => {
                          const colors = STATUS_COLORS[res.status] || STATUS_COLORS.confirmed
                          const statusLabel = getStatusLabel(res.status)
                          const currencySymbol = getCurrencySymbol(res.currency || 'EUR')

                          return (
                            <div
                              key={res.id}
                              className={`${colors.bg} ${colors.border} border rounded p-2 text-xs`}
                            >
                              <div className={`font-semibold line-clamp-1 ${colors.text}`}>
                                {res.guestName}
                              </div>
                              <div className={`text-xs ${colors.text} opacity-75`}>
                                {res.guestCount} {res.guestCount === 1 ? 'hóspede' : 'hóspedes'}
                              </div>
                              <div className={`font-bold ${colors.text}`}>
                                {currencySymbol} {res.price.toFixed(2)}
                              </div>
                              <div className={`text-xs font-semibold ${colors.text}`}>
                                {statusLabel}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
