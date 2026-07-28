'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import '@/styles/calendar-kanban.css'

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const DAYS_SHORT = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

interface Reservation {
  id: string
  guestName: string
  guestCount: number
  startDate: Date
  endDate: Date
  price: number
  currency: string
  status: string
}

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

// Default property data
const defaultProperty: Property = {
  id: '',
  name: '',
  type: 'Property',
  location: '',
  imageUrl: '',
}

const defaultReservations: Reservation[] = []

// Color palette for different guests - Using primary blue from design.md with variations
const GUEST_COLORS = [
  '#10203E', // Primary institutional blue
  '#0c1830', // Primary active (darker)
  '#152543', // Slightly lighter
  '#1a2d4d', // Medium
  '#0f1c2e', // Darker variant
]

// Generate consistent color for guest based on name hash
const getGuestColor = (guestName: string, reservationId: string): string => {
  const hash = (guestName + reservationId).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  return GUEST_COLORS[hash % GUEST_COLORS.length]
}

// Helper function to generate calendar days grid
function generateDaysGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const daysGrid: (number | null)[] = []

  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    daysGrid.push(i)
  }

  return daysGrid
}

// Mini calendar component for year view
function MiniCalendar({
  year,
  month,
  selectedDates,
  dailyPrices,
  onDayClick,
}: {
  year: number
  month: number
  selectedDates: Date[]
  dailyPrices: Record<string, number>
  onDayClick: (day: number, year: number, month: number) => void
}) {
  const daysGrid = generateDaysGrid(year, month)
  const monthName = MONTHS[month]

  return (
    <div
      style={{
        background: '#ffffff',
        border: '2px solid #1b2430',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '300px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '700', color: '#1b2430', textAlign: 'center', textTransform: 'capitalize' }}>
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
        }}
      >
        {/* Day headers */}
        {DAYS_SHORT.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: '600',
              color: '#4d5566',
              padding: '4px 0',
            }}
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {daysGrid.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
          const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null
          const isSelected = day && selectedDates.some(d => d.getUTCDate() === day && d.getUTCMonth() === month && d.getUTCFullYear() === year)

          return (
            <div
              key={idx}
              onClick={() => day && onDayClick(day, year, month)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: isSelected ? '#e3f2fd' : (day ? '#fbfaf6' : 'transparent'),
                border: isSelected ? '2px solid #2196f3' : (day ? '1px solid #efeadf' : 'none'),
                fontSize: '12px',
                fontWeight: day ? '600' : '400',
                color: '#1b2430',
                borderRadius: '4px',
                cursor: day ? 'pointer' : 'default',
                transition: 'all 0.2s',
                padding: '2px',
              }}
            >
              {day && (
                <>
                  <div>{day}</div>
                  {dayPrice && <div style={{ fontSize: '9px', color: '#4d5566' }}>R${dayPrice}</div>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PropertyCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'
  const propertyId = (params.propertyId as string) || ''

  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1))
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month')
  const [isMobile, setIsMobile] = useState(false)
  const [property, setProperty] = useState<Property>(defaultProperty)
  const [reservations, setReservations] = useState<Reservation[]>(defaultReservations)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [showPriceEditor, setShowPriceEditor] = useState(false)
  const [editingPrice, setEditingPrice] = useState<number | ''>('')
  const [editingConfig, setEditingConfig] = useState<'preco' | 'desconto' | 'disponibilidade' | 'cancelamentos' | null>(null)
  const [configTab, setConfigTab] = useState<'precos' | 'descontos' | 'disponibilidade'>('precos')
  const [smartPriceEnabled, setSmartPriceEnabled] = useState(false)
  const [priceMin, setPriceMin] = useState(80)
  const [previousPriceMin, setPreviousPriceMin] = useState(80)
  const [overwriteCustomized, setOverwriteCustomized] = useState(false)
  const [priceMax, setPriceMax] = useState(190)
  const [discountSemanal, setDiscountSemanal] = useState(10)
  const [discountMensal, setDiscountMensal] = useState(20)
  const [minStay, setMinStay] = useState(3)
  const [maxStay, setMaxStay] = useState(90)
  const [availabilityPeriod, setAvailabilityPeriod] = useState(6)
  const [noticeDay, setNoticeDay] = useState(1)
  const [cancellationPolicy, setCancellationPolicy] = useState('flexible')
  const [dailyPrices, setDailyPrices] = useState<Record<string, number>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)

  // Get all dates between start and end (inclusive)
  const getDateRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = []
    const s = new Date(Math.min(start.getTime(), end.getTime()))
    const e = new Date(Math.max(start.getTime(), end.getTime()))
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }
    return dates
  }

  // Load daily prices from API
  const loadDailyPrices = async () => {
    if (!propertyId) return
    try {
      const res = await fetch(`/api/properties/${propertyId}/daily-prices`)
      console.log('[loadDailyPrices] API response status:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('[loadDailyPrices] API data received:', data)
        const priceMap: Record<string, number> = {}
        if (Array.isArray(data)) {
          data.forEach((p: { date: string; base_price: number }) => {
            priceMap[p.date] = p.base_price
          })
        }
        console.log('[loadDailyPrices] Price map built:', priceMap)
        setDailyPrices(priceMap)
      } else {
        console.warn('[loadDailyPrices] API returned status:', res.status)
      }
    } catch (error) {
      console.error('[loadDailyPrices] Error:', error)
    }
  }

  // Fill empty days with a basic price
  // Fetch reservations and prices on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadDailyPrices()

        // Calculate date range for the current month
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()

        // First day of the month
        const fromDate = new Date(Date.UTC(year, month, 1))
        const from = fromDate.toISOString().split('T')[0] // "2026-07-01"

        // Last day of the month
        const toDate = new Date(Date.UTC(year, month + 1, 0))
        const to = toDate.toISOString().split('T')[0] // "2026-07-31"

        // Build query string with date parameters
        const queryParams = new URLSearchParams()
        queryParams.set('from', from)
        queryParams.set('to', to)

        console.log(`[fetchData] Fetching reservations for ${month + 1}/${year}: from=${from} to=${to}`)
        const reservRes = await fetch(`/api/calendar/reservations?${queryParams}`)

        if (reservRes.ok) {
          const data = await reservRes.json()
          const events = Array.isArray(data) ? data : (data.data || [])
          const propertyReservations = events.filter((evt: any) => evt.extendedProps?.property_id === propertyId)

          // Extract property name from first reservation if available
          const propertyNameFromReservations = propertyReservations[0]?.extendedProps?.property_name

          setProperty({
            id: propertyId,
            name: propertyNameFromReservations || '',
            type: 'Property',
            location: '',
            imageUrl: '',
          })

          const mapped = propertyReservations
            .map((evt: any) => {
              // Parse dates as UTC (same as CalendarKanbanView)
              const startStr = evt.start.split('T')[0] // "2026-07-23"
              const endStr = evt.end.split('T')[0] // "2026-07-28"
              const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
              const [endYear, endMonth, endDay] = endStr.split('-').map(Number)

              return {
                id: evt.id,
                propertyId: evt.extendedProps?.property_id || '',
                guestName: evt.extendedProps?.guest_name || 'Hóspede',
                guestCount: evt.extendedProps?.number_of_guests || 1,
                startDate: new Date(Date.UTC(startYear, startMonth - 1, startDay)),
                endDate: new Date(Date.UTC(endYear, endMonth - 1, endDay)),
                price: evt.extendedProps?.total_amount || 0,
                currency: evt.extendedProps?.currency || 'EUR',
                status: evt.extendedProps?.status || 'confirmed',
              }
            })
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
          setReservations(mapped)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setProperty(defaultProperty)
        setReservations(defaultReservations)
      }
    }
    fetchData()
  }, [params.propertyId, currentDate])

  // Detect mobile on mount
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Global pointerup handler for drag selection (works with both mouse and touch)
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handleDayMouseUp()
      }
    }
    window.addEventListener('pointerup', handleGlobalPointerUp)
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp)
  }, [isDragging, dragStart, dragEnd])

  // Calculate year and month first (needed by handleDayClick)
  const year = currentDate.getFullYear()
  const monthIndex = currentDate.getMonth()

  // Handle day drag selection
  const handleDayMouseDown = (day: number, clickYear: number, clickMonth: number) => {
    const date = new Date(Date.UTC(clickYear, clickMonth, day))
    setIsDragging(true)
    setDragStart(date)
    setDragEnd(date)
  }

  const handleDayMouseEnter = (day: number, clickYear: number, clickMonth: number) => {
    if (!isDragging || !dragStart) return
    const date = new Date(Date.UTC(clickYear, clickMonth, day))
    setDragEnd(date)
  }

  const handleDayMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      return
    }

    const dateRange = getDateRange(dragStart, dragEnd)
    setSelectedDates(dateRange)
    console.log(`📅 Selected ${dateRange.length} days (drag from ${dragStart.toISOString().split('T')[0]} to ${dragEnd.toISOString().split('T')[0]})`)

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  // Handle day click for price editing - open modal if not dragging
  const handleDayClick = (day: number, clickYear: number, clickMonth: number) => {
    if (isDragging) return // Don't trigger click during drag

    // Desktop: Single click - open modal to edit price for this day
    const date = new Date(Date.UTC(clickYear, clickMonth, day))
    setSelectedDates([date])
    setShowPriceEditor(true)
    setEditingPrice('')
  }

  // Mobile: Toggle day selection (accumulate multiple days)
  const handleToggleDaySelection = (day: number, clickYear: number, clickMonth: number) => {
    if (isDragging) return // Don't trigger click during drag

    const date = new Date(Date.UTC(clickYear, clickMonth, day))
    const isAlreadySelected = selectedDates.some(d =>
      d.getUTCDate() === day &&
      d.getUTCMonth() === clickMonth &&
      d.getUTCFullYear() === clickYear
    )

    if (isAlreadySelected) {
      // Remove from selection
      setSelectedDates(selectedDates.filter(d =>
        !(d.getUTCDate() === day && d.getUTCMonth() === clickMonth && d.getUTCFullYear() === clickYear)
      ))
    } else {
      // Add to selection
      setSelectedDates([...selectedDates, date])
    }

    // NÃO abre modal aqui - modal só abre quando clica em "Editar Preço"
  }

  const handleSavePrice = async () => {
    if (!property.id || editingPrice === '') return

    const price = parseFloat(String(editingPrice))
    if (isNaN(price) || price < 1) {
      alert('Preço deve ser >= 1')
      return
    }

    try {
      let dates: string[]

      // If no dates selected, apply to all days for next 6 months
      if (selectedDates.length === 0) {
        console.log('💾 Saving base price for all days (6 months) with price:', price)
        const today = new Date()
        const endDate = new Date(today.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)
        dates = []
        for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0])
        }
      } else {
        console.log('💾 Saving prices for', selectedDates.length, 'selected days with price:', price)
        dates = selectedDates.map(d => d.toISOString().split('T')[0])
      }

      console.log('📅 Dates:', dates.length > 5 ? `${dates.length} dates` : dates)

      const response = await fetch(`/api/properties/${property.id}/pricing/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates,
          base_price: price,
        }),
      })

      console.log('📡 Response status:', response.status)
      const result = await response.json()
      console.log('📦 Response:', result)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update prices')
      }

      setSelectedDates([])
      setEditingPrice('')
      setShowPriceEditor(false)

      // Reload daily prices to update the calendar display
      await loadDailyPrices()

      alert(`✅ ${result.data.updated_dates} dia(s) atualizado(s) com sucesso!`)
    } catch (error) {
      console.error('❌ Error saving prices:', error)
      alert('Erro ao guardar preço: ' + (error instanceof Error ? error.message : 'Desconhecido'))
    }
  }

  const handleSaveBasePriceConfig = async () => {
    console.log('🎯 [1] START: handleSaveBasePriceConfig called')
    console.log(`📋 Mode: ${overwriteCustomized ? 'FORCE (overwrite all)' : 'SMART (preserve customized)'}`)

    if (!property.id || priceMin <= 0) {
      alert('Preço base deve ser > 0')
      return
    }

    try {
      console.log('💾 [1] Saving base price config:', priceMin)

      // Generate all dates for the next 6 months
      const today = new Date()
      const endDate = new Date(today.getTime() + 6 * 30 * 24 * 60 * 60 * 1000)
      const allDates: string[] = []

      for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(d.toISOString().split('T')[0])
      }

      console.log(`📅 Generated ${allDates.length} dates for next 6 months`)

      let datesToUpdate: string[] = []

      if (overwriteCustomized) {
        // FORCE MODE: Update all dates (including customized)
        datesToUpdate = allDates
        console.log(`🔄 [FORCE MODE] Atualizando todos os ${datesToUpdate.length} dias (incluindo customizados)`)
      } else {
        // SMART MODE: Only update empty days OR days with previous price
        datesToUpdate = allDates.filter(dateStr => {
          const currentPrice = dailyPrices[dateStr]
          // Include if: no price OR has previous price
          return !currentPrice || currentPrice === previousPriceMin
        })
        console.log(`🔍 [SMART MODE] Atualizando ${datesToUpdate.length} dias (preservando customizados)`)
        console.log(`   - Dias sem preço: ${allDates.filter(d => !dailyPrices[d]).length}`)
        console.log(`   - Dias com preço anterior (${previousPriceMin}): ${allDates.filter(d => dailyPrices[d] === previousPriceMin).length}`)
      }

      if (datesToUpdate.length === 0) {
        alert('ℹ️ Nenhum dia para atualizar. Todos os dias têm preços customizados diferentes.')
        setEditingConfig(null)
        return
      }

      // Call API to update prices
      const response = await fetch(`/api/properties/${property.id}/pricing/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: datesToUpdate,
          base_price: priceMin,
        }),
      })

      console.log('📡 [2] AFTER API: Response status:', response.status)
      const result = await response.json()
      console.log('📦 [2] AFTER API: Response data:', result)

      if (!result.success) {
        throw new Error(result.error || 'Failed to update prices')
      }

      // Reload daily prices to update the calendar display
      console.log('🔄 [3] Calling loadDailyPrices...')
      await loadDailyPrices()
      console.log('✅ [3] AFTER loadDailyPrices: Prices reloaded, dailyPrices state updated')

      // Force visual re-render by updating the date
      console.log('🔄 [4] Forcing calendar re-render with setCurrentDate...')
      setCurrentDate(new Date(currentDate))

      // Close modal AFTER all updates
      console.log('🔄 [4] Closing modal with setEditingConfig(null)...')
      setEditingConfig(null)

      // Show success message
      const modeLabel = overwriteCustomized ? 'forçado' : 'inteligente'
      const successMsg = `✅ ${result.data.updated_dates} dia(s) atualizado(s) com sucesso!\n(Modo ${modeLabel}: R$${priceMin})`
      console.log('[5] SUCCESS:', successMsg)
      alert(successMsg)
    } catch (error) {
      console.error('❌ ERROR saving base price config:', error)
      alert('Erro ao guardar preço base: ' + (error instanceof Error ? error.message : 'Desconhecido'))
    }
  }

  const monthDisplay = MONTHS[monthIndex]
  const daysGrid = generateDaysGrid(year, monthIndex)

  // Calculate today for determining past/future reservations
  const todayDate = new Date()
  const today = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate()))

  // Show all reservations (including past ones) - gives full calendar history
  const filteredReservations = reservations

  // Mobile calendar view with prices
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fbfaf6' }}>
        {/* Mobile Header - Airbnb style */}
        <div style={{ padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #efeadf', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={() => router.push(`/${locale}/calendar`)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#1b2430',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: '600',
            }}
            title="Retornar"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0'
              e.currentTarget.style.borderRadius = '8px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
            }}
          >
            <span style={{ fontSize: '20px' }}>←</span>
            Retornar
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1b2430', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {property.name.substring(0, 30)}
            </h1>
          </div>
          <button
            onClick={() => {}}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            📅
          </button>
          <button
            onClick={() => setEditingConfig('preco')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⚙️
          </button>
        </div>

        {/* Mobile Calendar with prices */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '24px' }}>
            {/* Month/Year navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex - 1, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', padding: '8px' }}
              >
                ←
              </button>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1b2430', textTransform: 'capitalize', flex: 1, textAlign: 'center' }}>
                {monthDisplay} {year}
              </h2>
              <button
                onClick={() => setCurrentDate(new Date(year, monthIndex + 1, 1))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#1b2430', padding: '8px' }}
              >
                →
              </button>
            </div>

            {/* Days of week */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
              {DAYS_SHORT.map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#4d5566', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with reservations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', minHeight: '300px' }}>
              {daysGrid.map((day, idx) => {
                // Get reservations for this day
                const dayReservations = day ? filteredReservations.filter(res => {
                  const dateToCheck = new Date(Date.UTC(year, monthIndex, day))
                  const startDate = new Date(Date.UTC(res.startDate.getUTCFullYear(), res.startDate.getUTCMonth(), res.startDate.getUTCDate()))
                  const endDate = new Date(Date.UTC(res.endDate.getUTCFullYear(), res.endDate.getUTCMonth(), res.endDate.getUTCDate()))
                  return dateToCheck >= startDate && dateToCheck < endDate
                }) : []

                const dateStr = day ? `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
                const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null

                const isSelected = day && selectedDates.some(d => d.getUTCDate() === day && d.getUTCMonth() === monthIndex && d.getUTCFullYear() === year)

                const isDragHovered = isDragging && dragStart && dragEnd && day ? (() => {
                  const d = new Date(Date.UTC(year, monthIndex, day))
                  const range = getDateRange(dragStart, dragEnd)
                  return range.some(rd => rd.getTime() === d.getTime())
                })() : false

                return (
                  <div
                    key={idx}
                    onPointerUp={() => day && handleToggleDaySelection(day, year, monthIndex)}
                    style={{
                      minHeight: day ? '100px' : 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      background: isSelected || isDragHovered ? '#e3f2fd' : (day ? '#ffffff' : '#f7f5ef'),
                      border: isSelected || isDragHovered ? '2px solid #2196f3' : (day ? '1px solid #efeadf' : 'none'),
                      borderRadius: '8px',
                      padding: day ? '8px' : '0',
                      cursor: day ? 'grab' : 'default',
                      transition: 'all 0.2s',
                      userSelect: 'none',
                    }}
                  >
                    {day && (
                      <>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1b2430', marginBottom: '4px' }}>
                          {day}
                        </div>
                        {dayPrice && (
                          <div style={{ fontSize: '10px', color: '#4d5566', marginBottom: '8px' }}>
                            R${dayPrice}
                          </div>
                        )}

                        {/* Reservations in this day */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
                          {dayReservations.map(res => {
                            const guestColor = getGuestColor(res.guestName, res.id)
                            const firstName = res.guestName.split(' ')[0]
                            const getCurrencySymbol = (curr: string) => {
                              const symbols: Record<string, string> = { 'EUR': '€', 'BRL': 'R$', 'USD': '$' }
                              return symbols[curr] || curr
                            }

                            // Check if reservation is in the past
                            const resEndDate = new Date(Date.UTC(res.endDate.getUTCFullYear(), res.endDate.getUTCMonth(), res.endDate.getUTCDate()))
                            const isPast = resEndDate < today
                            const bgColor = isPast ? '#c0c0c0' : guestColor // Cinzento para passadas

                            return (
                              <div
                                key={res.id}
                                style={{
                                  padding: '6px 8px',
                                  background: bgColor,
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '8px',
                                  fontWeight: '600',
                                  lineHeight: '1.2',
                                  opacity: isPast ? 0.6 : 1,
                                }}
                                title={res.guestName}
                              >
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '1px' }}>
                                  {firstName}
                                </div>
                                <div style={{ fontSize: '7px', opacity: 0.9 }}>
                                  {res.guestCount}h · {getCurrencySymbol(res.currency || 'EUR')}{res.price.toFixed(0)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected dates footer bar */}
          {selectedDates.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              right: 20,
              background: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              zIndex: 100,
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                {selectedDates.length} dia(s) selecionado(s)
              </span>
              <button
                onClick={() => setShowPriceEditor(true)}
                style={{
                  padding: '8px 16px',
                  background: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#111827'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#1f2937'}
              >
                Editar Preço
              </button>
              <button
                onClick={() => setSelectedDates([])}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
              >
                Limpar Seleção
              </button>
            </div>
          )}

          {/* Price editor modal */}
          {showPriceEditor && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setShowPriceEditor(false)}
            >
              <div
                style={{
                  background: '#ffffff',
                  padding: '24px',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  width: '90%',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                  Editar Preço Base
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                  {selectedDates.length} dia(s) selecionado(s)
                </p>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={editingPrice}
                  onChange={(e) => setEditingPrice(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="Preço Base (€)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    marginBottom: '20px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setShowPriceEditor(false)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePrice}
                    disabled={editingPrice === ''}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: editingPrice === '' ? '#d1d5db' : '#1f2937',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: editingPrice === '' ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (editingPrice !== '') {
                        e.currentTarget.style.background = '#111827'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingPrice !== '') {
                        e.currentTarget.style.background = '#1f2937'
                      }
                    }}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reservations summary - Airbnb style */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700', color: '#1b2430' }}>
              Reservas ({filteredReservations.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredReservations.map(res => {
                const guestColor = getGuestColor(res.guestName, res.id)
                const startDate = new Date(Date.UTC(res.startDate.getUTCFullYear(), res.startDate.getUTCMonth(), res.startDate.getUTCDate()))
                const endDate = new Date(Date.UTC(res.endDate.getUTCFullYear(), res.endDate.getUTCMonth(), res.endDate.getUTCDate()))
                const todayUTC = new Date()
                todayUTC.setUTCHours(0, 0, 0, 0)

                let status = 'Confirmado'
                if (todayUTC >= startDate && todayUTC < endDate) {
                  status = 'Hospedando'
                }

                return (
                  <div
                    key={res.id}
                    style={{
                      padding: '10px 14px',
                      background: guestColor,
                      border: 'none',
                      borderRadius: '20px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Guest name */}
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                      {res.guestName}
                    </div>

                    {/* Date range */}
                    <div style={{ whiteSpace: 'nowrap', fontSize: '11px', opacity: 0.9 }}>
                      {startDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                    </div>

                    {/* Status */}
                    <div style={{ whiteSpace: 'nowrap', fontSize: '10px', opacity: 0.85 }}>
                      {status}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile Config Modal - with tabs */}
        {editingConfig === 'preco' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                marginTop: 'auto',
                background: '#ffffff',
                borderRadius: '24px 24px 0 0',
                padding: '20px',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  onClick={() => setEditingConfig(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#1b2430' }}
                >
                  ✕
                </button>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>Configurações</h2>
                <div style={{ width: '24px' }} />
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #efeadf', paddingBottom: '12px' }}>
                {['precos', 'descontos', 'disponibilidade'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setConfigTab(tab as any)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: configTab === tab ? '3px solid #1b2430' : 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: configTab === tab ? '#1b2430' : '#4d5566',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div>
                {/* Preços Tab */}
                {configTab === 'precos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço básico
                      </label>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>R$ {priceMin}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço de fim de semana
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>R$ {priceMax}</div>
                        <button style={{ background: 'none', border: 'none', color: '#1b2430', cursor: 'pointer', fontWeight: '600', fontSize: '13px', textDecoration: 'underline' }}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1b2430', marginBottom: '4px' }}>Preço Inteligente</div>
                        <div style={{ fontSize: '11px', color: '#4d5566' }}>Ajusta automaticamente</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smartPriceEnabled}
                        onChange={(e) => setSmartPriceEnabled(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                )}

                {/* Descontos Tab */}
                {configTab === 'descontos' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Por semana
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430', marginBottom: '4px' }}>{discountSemanal}%</div>
                      <div style={{ fontSize: '11px', color: '#4d5566' }}>A média semanal é de R$ 1.059</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Por mês
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430', marginBottom: '4px' }}>{discountMensal}%</div>
                      <div style={{ fontSize: '11px', color: '#4d5566' }}>A média mensal é de R$ 4.307</div>
                    </div>
                  </div>
                )}

                {/* Disponibilidade Tab */}
                {configTab === 'disponibilidade' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Número mínimo de noites
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>{minStay}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Número máximo de noites
                      </label>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>{maxStay}</div>
                    </div>

                    <div style={{ padding: '12px', background: '#fbfaf6', borderRadius: '12px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Tempo de antecedência
                      </label>
                      <div style={{ fontSize: '14px', color: '#1b2430' }}>Mesmo dia</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer padding */}
              <div style={{ height: '16px' }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fbfaf6' }}>
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header com Controls */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #efeadf',
            background: '#fbfaf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1b2430' }}>
                {viewMode === 'year' ? year : (monthDisplay.charAt(0).toUpperCase() + monthDisplay.slice(1))}
              </h2>
              <button
              onClick={() => router.push(`/${locale}/calendar`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #efeadf',
                fontSize: '13px',
                fontWeight: '600',
                color: '#1b2430',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: 'fit-content',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f7f5ef'
                e.currentTarget.style.borderColor = '#cfc4aa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#efeadf'
              }}
            >
              ← Voltar
            </button>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#4d5566', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {property.name}
            </p>
          </div>

          {/* Month Selector, Navigation Buttons, and View Toggle */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {viewMode === 'month' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  ←
                </button>

                <select
                  value={currentDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(parseInt(e.target.value))
                    setCurrentDate(newDate)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #efeadf',
                    background: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1b2430',
                    cursor: 'pointer',
                    minWidth: '160px',
                  }}
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>
                      {month.charAt(0).toUpperCase() + month.slice(1)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 1)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  →
                </button>
              </div>
            )}

            {viewMode === 'year' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() - 3)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(currentDate)
                    newDate.setMonth(newDate.getMonth() + 3)
                    setCurrentDate(newDate)
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    border: '1px solid #efeadf',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1b2430',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f7f5ef'
                    e.currentTarget.style.borderColor = '#cfc4aa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#efeadf'
                  }}
                >
                  →
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', border: '1px solid #efeadf', borderRadius: '8px' }}>
              <button
                onClick={() => setViewMode('month')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'month' ? '#1b2430' : '#ffffff',
                  color: viewMode === 'month' ? '#ffffff' : '#1b2430',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '6px 0 0 6px',
                }}
              >
                Mês
              </button>
              <button
                onClick={() => setViewMode('year')}
                style={{
                  padding: '8px 12px',
                  background: viewMode === 'year' ? '#1b2430' : '#ffffff',
                  color: viewMode === 'year' ? '#ffffff' : '#1b2430',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                Ano
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {viewMode === 'month' ? (
            // Month View
            <div style={{ maxWidth: '100%' }}>
              {/* Combined headers and days grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '16px',
                  gridAutoRows: 'auto',
                }}
              >
                {/* Day headers */}
                {['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].map(day => (
                  <div
                    key={`header-${day}`}
                    style={{
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#4d5566',
                      textTransform: 'capitalize',
                      textDecoration: 'uppercase',
                      letterSpacing: '0.5px',
                      paddingBottom: '8px',
                    }}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}

                {/* Days grid */}
                {daysGrid.map((day, idx) => {
                  // Get reservations for this day
                  const dayReservations = day ? filteredReservations.filter(res => {
                    const dateToCheck = new Date(Date.UTC(year, monthIndex, day))
                    const startDate = new Date(Date.UTC(res.startDate.getUTCFullYear(), res.startDate.getUTCMonth(), res.startDate.getUTCDate()))
                    const endDate = new Date(Date.UTC(res.endDate.getUTCFullYear(), res.endDate.getUTCMonth(), res.endDate.getUTCDate()))
                    return dateToCheck >= startDate && dateToCheck < endDate
                  }) : []

                  // Calculate daily price
                  const dateStr = day ? `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
                  const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null

                  const isSelected = day && selectedDates.some(d => d.getUTCDate() === day && d.getUTCMonth() === monthIndex && d.getUTCFullYear() === year)

                  const isDragHovered = isDragging && dragStart && dragEnd && day ? (() => {
                    const d = new Date(Date.UTC(year, monthIndex, day))
                    const range = getDateRange(dragStart, dragEnd)
                    return range.some(rd => rd.getTime() === d.getTime())
                  })() : false

                  return (
                    <div
                      key={idx}
                      onMouseDown={() => day && handleDayMouseDown(day, year, monthIndex)}
                      onMouseEnter={(e) => {
                        if (day) {
                          e.currentTarget.style.background = isSelected || isDragHovered ? '#e3f2fd' : '#f7f5ef'
                          handleDayMouseEnter(day, year, monthIndex)
                        }
                      }}
                      onMouseUp={() => {
                        handleDayMouseUp()
                        // If drag didn't happen (dragStart === dragEnd), toggle selection
                        if (day && !isDragging && dragStart && dragEnd && dragStart.getTime() === dragEnd.getTime()) {
                          handleToggleDaySelection(day, year, monthIndex)
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (day) e.currentTarget.style.background = isSelected || isDragHovered ? '#e3f2fd' : '#ffffff'
                      }}
                      style={{
                        minHeight: day ? '120px' : 'auto',
                        border: isSelected || isDragHovered ? '2px solid #2196f3' : (day ? '1px solid #efeadf' : 'none'),
                        borderRadius: '12px',
                        padding: day ? '16px' : '0',
                        background: isSelected || isDragHovered ? '#e3f2fd' : (day ? '#ffffff' : 'transparent'),
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: day ? 'grab' : 'default',
                        transition: 'all 0.2s',
                      }}
                    >
                      {day && (
                        <>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1b2430', marginBottom: '12px' }}>
                            {day}
                          </div>

                          {dayPrice && (
                            <div style={{ fontSize: '12px', color: '#4d5566', marginBottom: '8px', fontWeight: '500' }}>
                              R${dayPrice}
                            </div>
                          )}

                          {/* Reservations in this day */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
                            {dayReservations.slice(0, 2).map(res => {
                              const guestColor = getGuestColor(res.guestName, res.id)
                              const firstName = res.guestName.split(' ')[0]
                              const getCurrencySymbol = (curr: string) => {
                                const symbols: Record<string, string> = { 'EUR': '€', 'BRL': 'R$', 'USD': '$' }
                                return symbols[curr] || curr
                              }

                              return (
                                <div
                                  key={res.id}
                                  style={{
                                    padding: '8px 10px',
                                    background: guestColor,
                                    borderRadius: '6px',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    lineHeight: '1.3',
                                  }}
                                  title={res.guestName}
                                >
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                                    {firstName}
                                  </div>
                                  <div style={{ fontSize: '9px', opacity: 0.9 }}>
                                    {res.guestCount} hosp. · {getCurrencySymbol(res.currency || 'EUR')}{res.price.toFixed(0)}
                                  </div>
                                </div>
                              )
                            })}
                            {dayReservations.length > 2 && (
                              <div style={{ fontSize: '9px', color: '#4d5566', fontStyle: 'italic', padding: '2px 0' }}>
                                +{dayReservations.length - 2} mais
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Year View - 3 months per row with vertical scroll
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                minHeight: '100%',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '24px',
                  maxWidth: '1100px',
                  width: '100%',
                  paddingBottom: '40px',
                }}
              >
                {[0, 1, 2].map(offset => {
                  const m = (monthIndex + offset) % 12
                  const y = offset === 0 && m > monthIndex ? year - 1 : year
                  return (
                    <MiniCalendar
                      key={`${y}-${m}`}
                      year={y}
                      month={m}
                      selectedDates={selectedDates}
                      dailyPrices={dailyPrices}
                      onDayClick={handleToggleDaySelection}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Configuration */}
      <div
        style={{
          width: '340px',
          borderLeft: '1px solid #efeadf',
          padding: '24px',
          overflowY: 'auto',
          background: '#fbfaf6',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: '700', color: '#1b2430' }}>
          Configuração
        </h3>

        {/* Config cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            {
              id: 'preco' as const,
              label: 'Preços',
              value: smartPriceEnabled
                ? `Preço Inteligente ativado\n${priceMin} € – ${priceMax} € por noite`
                : `${priceMin} € – ${priceMax} € por noite`
            },
            {
              id: 'desconto' as const,
              label: 'Descontos',
              value: `Semanal: ${discountSemanal}%\nMensal: ${discountMensal}%`
            },
            {
              id: 'disponibilidade' as const,
              label: 'Disponibilidade',
              value: `Estadias de ${minStay} a ${maxStay} noites\nPeríodo: ${availabilityPeriod} meses`,
            },
            {
              id: 'cancelamentos' as const,
              label: 'Cancelamentos',
              value: cancellationPolicy === 'flexible'
                ? 'Flexível\nReembolso até 1 dia antes'
                : cancellationPolicy === 'moderate'
                ? 'Moderada\nReembolso até 5 dias antes'
                : cancellationPolicy === 'limited'
                ? 'Limitada\nReembolso até 14 dias antes'
                : 'Firme\nReembolso até 30 dias antes',
            },
          ].map((item) => (
            <div
              key={item.id}
              style={{
                background: '#ffffff',
                border: '1px solid #efeadf',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                if (item.id === 'preco') {
                  // Capture previous priceMin when opening the modal
                  setPreviousPriceMin(priceMin)
                  setOverwriteCustomized(false) // Reset checkbox when opening modal
                }
                setEditingConfig(item.id)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f7f5ef'
                e.currentTarget.style.borderColor = '#cfc4aa'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.borderColor = '#efeadf'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '700', color: '#1b2430' }}>
                    {item.label}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#4d5566',
                      whiteSpace: 'pre-line',
                      lineHeight: '1.5',
                    }}
                  >
                    {item.value}
                  </p>
                </div>
                <span style={{ color: '#1b2430', fontSize: '16px', marginTop: '0px', flexShrink: 0, fontWeight: '600' }}>
                  →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal - Preços */}
        {editingConfig === 'preco' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Preços
              </h3>

              {/* Preço Inteligente Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: '#fbfaf6',
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1b2430', marginBottom: '4px' }}>
                    Preço Inteligente
                  </div>
                  <div style={{ fontSize: '12px', color: '#4d5566' }}>
                    Ajusta automaticamente baseado em demanda
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={smartPriceEnabled}
                  onChange={(e) => setSmartPriceEnabled(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!smartPriceEnabled ? (
                  // Show only Preço Base when smart price is OFF
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço Base (€)
                      </label>
                      <input
                        type="number"
                        value={priceMin}
                        onChange={(e) => setPriceMin(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #efeadf',
                          borderRadius: '8px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Overwrite Customized Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fbfaf6', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        checked={overwriteCustomized}
                        onChange={(e) => setOverwriteCustomized(e.target.checked)}
                        id="overwrite-checkbox"
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                      <label htmlFor="overwrite-checkbox" style={{ fontSize: '13px', color: '#1b2430', margin: 0, cursor: 'pointer' }}>
                        Sobrescrever preços customizados?
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#4d5566', margin: '8px 0 0 0' }}>
                      {overwriteCustomized
                        ? '✓ Todos os dias serão atualizados (incluindo preços customizados)'
                        : 'Se desmarcado: apenas dias vazios e com preço anterior serão atualizados'}
                    </p>
                  </>
                ) : (
                  // Show Preço Mínimo and Máximo when smart price is ON
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço Mínimo (€)
                      </label>
                      <input
                        type="number"
                        value={priceMin}
                        onChange={(e) => setPriceMin(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #efeadf',
                          borderRadius: '8px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                        Preço Máximo (€)
                      </label>
                      <input
                        type="number"
                        value={priceMax}
                        onChange={(e) => setPriceMax(parseInt(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #efeadf',
                          borderRadius: '8px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </>
                )}

                {smartPriceEnabled && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#e8f0fe',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#1b2430',
                      borderLeft: '4px solid #1b2430',
                    }}
                  >
                    ℹ️ Preço inteligente usa automaticamente o preço mínimo em baixa demanda e máximo em alta demanda.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#4d5566', flex: 1, alignSelf: 'center' }}>
                    Aplica este preço a todos os dias. Clique em um dia para editar preço específico.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBasePriceConfig}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Descontos */}
        {editingConfig === 'desconto' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Descontos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    padding: '16px',
                    background: '#fbfaf6',
                    borderRadius: '12px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Desconto Semanal (7+ dias)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      value={discountSemanal}
                      onChange={(e) => setDiscountSemanal(parseInt(e.target.value))}
                      min="0"
                      max="100"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #efeadf',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1b2430', minWidth: '30px' }}>
                      %
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Aplicado automaticamente para reservas de 7 ou mais noites
                  </p>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#f7f5ef',
                    borderRadius: '12px',
                  }}
                >
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Desconto Mensal (28+ dias)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="number"
                      value={discountMensal}
                      onChange={(e) => setDiscountMensal(parseInt(e.target.value))}
                      min="0"
                      max="100"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #efeadf',
                        borderRadius: '8px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#1b2430', minWidth: '30px' }}>
                      %
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Aplicado automaticamente para reservas de 28 ou mais noites
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Disponibilidade */}
        {editingConfig === 'disponibilidade' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Editar Disponibilidade
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Estadia Mínima (noites)
                  </label>
                  <input
                    type="number"
                    value={minStay}
                    onChange={(e) => setMinStay(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Número mínimo de noites para reserva
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Estadia Máxima (noites)
                  </label>
                  <input
                    type="number"
                    value={maxStay}
                    onChange={(e) => setMaxStay(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Número máximo de noites permitidas
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#1b2430' }}>
                    Período de Disponibilidade
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[6, 12, 18].map(months => (
                      <button
                        key={months}
                        onClick={() => setAvailabilityPeriod(months)}
                        style={{
                          padding: '12px',
                          border: availabilityPeriod === months ? '2px solid #1b2430' : '1px solid #efeadf',
                          borderRadius: '8px',
                          background: availabilityPeriod === months ? '#f7f5ef' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1b2430',
                          transition: 'all 0.2s',
                        }}
                      >
                        {months}m
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#4d5566' }}>
                    Dias após esse período serão bloqueados automaticamente
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal - Cancelamentos */}
        {editingConfig === 'cancelamentos' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setEditingConfig(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '700', color: '#1b2430' }}>
                Política de Cancelamento
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    value: 'flexible',
                    label: 'Flexível',
                    terms: 'Reembolso integral até 1 dia antes do check-in',
                    details: 'Reembolso parcial no prazo de um dia após o check-in. Aos hóspedes que cancelem menos de um dia antes do check-in, é cobrada uma noite. Se os hóspedes cancelarem durante a estadia, é cobrada uma noite extra e o restante é reembolsado.',
                  },
                  {
                    value: 'moderate',
                    label: 'Moderada',
                    terms: 'Reembolso integral até 5 dias antes do check-in',
                    details: 'Reembolso parcial no prazo de 5 dias após o check-in. Se os hóspedes cancelarem quando faltarem menos de 5 dias para o check-in ou durante a estadia, é-lhes cobrada uma noite extra e recebem um reembolso de 50% do valor das noites não usufruídas.',
                  },
                  {
                    value: 'limited',
                    label: 'Limitada',
                    terms: 'Reembolso integral até 14 dias antes do check-in',
                    details: 'Reembolso parcial 7 a 14 dias antes do check-in. Os hóspedes que cancelarem 7 a 14 dias antes do check-in recebem um reembolso de 50% do total. Após este período, a estadia não é reembolsável.',
                  },
                  {
                    value: 'strict',
                    label: 'Firme',
                    terms: 'Reembolso total pelo menos 30 dias antes do check-in',
                    details: 'Reembolso parcial 7 a 30 dias antes do check-in. Se os hóspedes cancelarem 7 a 30 dias antes do check-in, recebem 50% de reembolso. Após este prazo, a estadia não é reembolsável.',
                  },
                ].map(policy => (
                  <div
                    key={policy.value}
                    onClick={() => setCancellationPolicy(policy.value as any)}
                    style={{
                      padding: '16px',
                      border: cancellationPolicy === policy.value ? '2px solid #1b2430' : '1px solid #efeadf',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: cancellationPolicy === policy.value ? '#f7f5ef' : '#ffffff',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1b2430', marginBottom: '6px' }}>
                      {policy.label}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#4d5566', marginBottom: '8px' }}>
                      {policy.terms}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7c8492', lineHeight: '1.5' }}>
                      {policy.details}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#f7f5ef',
                      border: '1px solid #efeadf',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1b2430',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setEditingConfig(null)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#1b2430',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected dates footer bar */}
        {selectedDates.length > 0 && !editingConfig && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            right: 20,
            background: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            zIndex: 100,
          }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
              {selectedDates.length} dia(s) selecionado(s)
            </span>
            <button
              onClick={() => setShowPriceEditor(true)}
              style={{
                padding: '8px 16px',
                background: '#1f2937',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#111827'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1f2937'}
            >
              Editar Preço
            </button>
          </div>
        )}

        {/* Price editor modal */}
        {showPriceEditor && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowPriceEditor(false)}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                Editar Preço Base
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                {selectedDates.length} dia(s) selecionado(s)
              </p>

              <input
                type="number"
                min="1"
                step="0.01"
                value={editingPrice}
                onChange={(e) => setEditingPrice(e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="Preço Base (€)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  marginBottom: '20px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPriceEditor(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrice}
                  disabled={editingPrice === ''}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: editingPrice === '' ? '#d1d5db' : '#1f2937',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: editingPrice === '' ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '14px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (editingPrice !== '') {
                      e.currentTarget.style.background = '#111827'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (editingPrice !== '') {
                      e.currentTarget.style.background = '#1f2937'
                    }
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
