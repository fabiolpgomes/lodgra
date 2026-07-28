'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { getISOWeekNumber, getISOWeekStartDate, getWeekDays } from '@/utils/weekUtils'
import { MonthYearPicker } from './MonthYearPicker'

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

// Design.md colors
const COLORS = {
  primary: '#10203E',
  primaryActive: '#0c1830',
  luxe: '#C9A227',
  ink: '#1B2430',
  body: '#4D5566',
  hairline: '#E5DFD2',
  canvas: '#FBFAF6',
  surface: '#F7F5EF',
}

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
  const [isNavigating, setIsNavigating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleDashboardClick = () => {
    setIsNavigating(true)
    router.push(`/${locale}/dashboard`)
  }

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

  // Sort properties by location (country) and limit to 7
  const propertiesWithReservations = [...properties]
    .sort((a, b) => (a.location || '').localeCompare(b.location || ''))
    .slice(0, 7)

  const monthDisplay = MONTHS[weekStartDate.getMonth()]
  const year = weekStartDate.getFullYear()

  const handlePrevWeek = () => {
    setCurrentWeek(prev => (prev === 1 ? 53 : prev - 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(prev => (prev === 53 ? 1 : prev + 1))
  }

  const handleMonthYearSelect = (selectedDate: Date) => {
    const selectedWeek = getISOWeekNumber(selectedDate)
    setCurrentWeek(selectedWeek)
    setShowMonthPicker(false)
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

  // Responsive sizing
  const propertyColWidth = isMobile ? 'w-24' : 'w-56'
  const dayColMinWidth = isMobile ? 'min-w-[90px]' : 'min-w-[140px]'
  const headerPadding = isMobile ? 'p-2' : 'p-6'
  const cellPadding = isMobile ? 'p-1' : 'p-2'
  const fontSize = isMobile ? 'text-xs' : 'text-sm'
  const titleFontSize = isMobile ? 'text-sm' : 'text-lg'
  const dayHeaderFontSize = isMobile ? 'text-xs' : 'text-sm'
  const minHeightCell = isMobile ? 'min-h-[80px]' : 'min-h-[120px]'

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.surface }}>
      {/* Header */}
      <div className={`border-b ${headerPadding}`} style={{ borderColor: COLORS.hairline, backgroundColor: COLORS.canvas }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleDashboardClick}
            disabled={isNavigating}
            className="flex items-center gap-2 font-semibold cursor-pointer hover:opacity-70 disabled:opacity-50 text-xs md:text-base"
            style={{ color: COLORS.primary }}
          >
            {isNavigating ? '⏳' : '←'} {!isMobile && 'Dashboard'}
          </button>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={handlePrevWeek} className="p-2 rounded" style={{ backgroundColor: COLORS.surface }}>
              <ChevronLeft size={isMobile ? 16 : 20} style={{ color: COLORS.primary }} />
            </button>
            <div className="text-center min-w-[120px]">
              <button
                onClick={() => setShowMonthPicker(true)}
                className="hover:opacity-70 transition-opacity cursor-pointer"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className={`${fontSize}`} style={{ color: COLORS.body }}>
                  {monthDisplay}
                </div>
              </button>
              <div className={`font-semibold ${titleFontSize}`} style={{ color: COLORS.primary }}>
                Sem {currentWeek}
              </div>
            </div>
            <button onClick={handleNextWeek} className="p-2 rounded" style={{ backgroundColor: COLORS.surface }}>
              <ChevronRight size={isMobile ? 16 : 20} style={{ color: COLORS.primary }} />
            </button>
          </div>
          <div className={`${fontSize}`} style={{ color: COLORS.body }}>
            {isMobile ? `${propertiesWithReservations.length}P` : `${propertiesWithReservations.length} Propriedades`}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Days Header */}
          <div className="flex" style={{ backgroundColor: COLORS.canvas, borderBottom: `1px solid ${COLORS.hairline}` }}>
            <div className={`${propertyColWidth} flex-shrink-0 border-r p-2 md:p-4 font-semibold ${dayHeaderFontSize}`} style={{ borderColor: COLORS.hairline, color: COLORS.primary }}>
              {isMobile ? 'Prop' : 'Propriedade'}
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
                    className={`flex-1 ${dayColMinWidth} p-2 text-center border-r`}
                    style={{
                      borderColor: COLORS.hairline,
                      backgroundColor: isToday ? 'rgba(16,32,62,0.08)' : COLORS.canvas,
                    }}
                  >
                    <div className={`font-semibold ${dayHeaderFontSize}`} style={{ color: COLORS.body }}>
                      {dayName}
                    </div>
                    <div
                      className={`font-bold ${titleFontSize}`}
                      style={{ color: isToday ? COLORS.primary : COLORS.ink }}
                    >
                      {dayNum}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rows for each property */}
          {propertiesWithReservations.map((property) => (
            <div key={property.id} className="flex" style={{ borderBottom: `1px solid ${COLORS.hairline}` }}>
              {/* Property name with image */}
              <div
                className={`${propertyColWidth} flex-shrink-0 border-r p-2 md:p-4`}
                style={{ borderColor: COLORS.hairline, backgroundColor: COLORS.canvas }}
              >
                <div
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => onPropertyClick?.(property.id)}
                >
                  {property.imageUrl && !isMobile && (
                    <div className="mb-3 rounded overflow-hidden h-16 bg-gray-200">
                      <Image
                        src={property.imageUrl}
                        alt={property.name}
                        width={224}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {property.imageUrl && isMobile && (
                    <div className="mb-2 rounded overflow-hidden h-10 bg-gray-200">
                      <Image
                        src={property.imageUrl}
                        alt={property.name}
                        width={96}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`font-semibold line-clamp-2 ${fontSize}`} style={{ color: COLORS.primary }}>
                    {isMobile ? property.name.split('|')[0] : property.name}
                  </div>
                  {!isMobile && (
                    <div className="text-xs" style={{ color: COLORS.body }}>
                      {property.type}
                    </div>
                  )}
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
                      className={`flex-1 ${dayColMinWidth} ${cellPadding} border-r ${minHeightCell}`}
                      style={{
                        borderColor: COLORS.hairline,
                        backgroundColor: isToday ? 'rgba(16,32,62,0.04)' : COLORS.surface,
                      }}
                    >
                      <div className="space-y-1 md:space-y-2">
                        {dayReservations.map((res) => {
                          const colors = STATUS_COLORS[res.status] || STATUS_COLORS.confirmed
                          const statusLabel = getStatusLabel(res.status)
                          const currencySymbol = getCurrencySymbol(res.currency || 'EUR')

                          return (
                            <div
                              key={res.id}
                              className={`${colors.bg} ${colors.border} border rounded p-1 md:p-2 text-xs`}
                            >
                              <div className={`font-semibold line-clamp-1 ${colors.text}`}>
                                {isMobile ? res.guestName.split(' ')[0] : res.guestName}
                              </div>
                              {!isMobile && (
                                <>
                                  <div className={`text-xs ${colors.text} opacity-75`}>
                                    {res.guestCount} {res.guestCount === 1 ? 'hosp.' : 'hosp.'}
                                  </div>
                                  <div className={`font-bold ${colors.text}`}>
                                    {currencySymbol} {res.price.toFixed(0)}
                                  </div>
                                  <div className={`text-xs font-semibold ${colors.text}`}>
                                    {statusLabel}
                                  </div>
                                </>
                              )}
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

      {/* Month/Year Picker Modal */}
      {showMonthPicker && (
        <MonthYearPicker
          currentDate={weekStartDate}
          onSelect={handleMonthYearSelect}
          onCancel={() => setShowMonthPicker(false)}
        />
      )}
    </div>
  )
}
