'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SettingsSidebar } from './SettingsSidebar'
import { CalendarDayClickModal } from './CalendarDayClickModal'
import { useCalendarSelection } from '@/hooks/useCalendarSelection'

interface CalendarWithSettingsProps {
  propertyId: string
  calendarComponent: React.ComponentType<{
    onDayClick: (day: number, year: number, month: number) => void
    onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
    selectedDates: string[]
    onMonthChange?: (month: number, year: number) => void
    reservations?: Reservation[]
    dailyPrices?: Record<string, number>
  }>
}

/**
 * Wrapper que integra:
 * - Calendário Kanban
 * - Settings Sidebar (5 cards)
 * - Day Click Modal
 * - Selection Management
 *
 * Layout Mobile-First:
 * - Mobile: Calendário em tela cheia, settings em abas
 * - Tablet/Desktop: 2 colunas (calendário + settings)
 */
interface Reservation {
  id: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

export function CalendarWithSettings({
  propertyId,
  calendarComponent: CalendarComponent,
}: CalendarWithSettingsProps) {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const selection = useCalendarSelection(propertyId)
  const [selectedDateStr, setSelectedDateStr] = useState<string[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [dailyPrices, setDailyPrices] = useState<Record<string, number>>({})

  // Convert selection to date strings for calendar highlighting
  const getSelectedDateStrings = useCallback(() => {
    return selection.state.selectedDates.map((d) => d.toISOString().split('T')[0])
  }, [])

  // Handle day click from calendar
  const handleDayClick = useCallback(
    (day: number, year: number, month: number) => {
      const clickedDate = new Date(year, month, day)
      selection.toggleDay(clickedDate)
      selection.openPriceModal(clickedDate)
    },
    []
  )

  // Handle range selection from calendar
  const handleRangeSelect = useCallback(
    (startDay: number, endDay: number, month: number, year: number) => {
      const startDate = new Date(year, month, startDay)
      const endDate = new Date(year, month, endDay)
      selection.selectDateRange(startDate, endDate)
      selection.openPriceModal({
        start: startDate,
        end: endDate,
      })
    },
    []
  )

  // Refetch all data
  const refetchData = useCallback(async () => {
    try {
      // Refetch prices
      const pricesResponse = await fetch(
        `/api/properties/${propertyId}/daily-prices`,
        { credentials: 'include' }
      )
      const prices = await pricesResponse.json()

      const monthPrices = prices.filter((p: { date: string; base_price: number }) => {
        const [year, month] = p.date.split('-').map(Number)
        return year === currentYear && month === currentMonth + 1
      })

      const dateStrings = monthPrices.map((p: { date: string }) => p.date)
      setSelectedDateStr(dateStrings)

      const priceMap: Record<string, number> = {}
      monthPrices.forEach((p: { date: string; base_price: number }) => {
        priceMap[p.date] = p.base_price
      })
      setDailyPrices(priceMap)

      // Refetch reservations
      try {
        const reservationsResponse = await fetch(
          `/api/properties/${propertyId}/reservations`,
          { credentials: 'include' }
        )
        const reservationsData = await reservationsResponse.json()

        const monthReservations = (reservationsData.data || []).filter(
          (res: any) => {
            if (!res.start_date || !res.end_date) return false
            const resStart = new Date(res.start_date)
            const resEnd = new Date(res.end_date)
            const monthStart = new Date(currentYear, currentMonth, 1)
            const monthEnd = new Date(currentYear, currentMonth + 1, 0)
            return resStart <= monthEnd && resEnd >= monthStart
          }
        )

        setReservations(
          monthReservations.map((res: any) => ({
            id: res.id,
            guestName: res.guest_name || 'Guest',
            guestCount: res.guest_count || 1,
            startDate: new Date(res.start_date),
            endDate: new Date(res.end_date),
            price: res.price_per_night || 0,
            status: res.status || 'pending',
          }))
        )
      } catch (err) {
        console.error('[ERROR] Failed to refetch reservations:', err)
      }
    } catch (error) {
      console.error('Error refetching data:', error)
    }
  }, [propertyId, currentYear, currentMonth])

  // Handle save price from modal
  const handleSavePrice = useCallback(
    async (price: number) => {
      if (selection.state.selectedDates.length === 0) return

      try {
        const startDate = selection.state.selectedDates[0]
        const endDate =
          selection.state.selectedDates[
            selection.state.selectedDates.length - 1
          ]

        const response = await fetch(
          `/api/properties/${propertyId}/pricing/bulk-update`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
              price,
            }),
            credentials: 'include',
          }
        )

        if (!response.ok) {
          throw new Error('Failed to save price')
        }

        selection.clearSelection()
        setSelectedDateStr([])

        // Refetch data to update UI
        await refetchData()
      } catch (error) {
        console.error('Error saving price:', error)
        throw error
      }
    },
    [propertyId, refetchData]
  )

  // Handle block dates from modal
  const handleBlockDates = useCallback(async () => {
    if (selection.state.selectedDates.length === 0) return

    try {
      const startDate = selection.state.selectedDates[0]
      const endDate =
        selection.state.selectedDates[selection.state.selectedDates.length - 1]

      const response = await fetch(
        `/api/properties/${propertyId}/calendar/block-dates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            reason: 'blocked-by-owner',
          }),
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to block dates')
      }

      selection.clearSelection()
      setSelectedDateStr([])
    } catch (error) {
      console.error('Error blocking dates:', error)
      throw error
    }
  }, [propertyId])

  // Fetch daily prices and reservations when month changes
  useEffect(() => {
    const fetchDataForMonth = async () => {
      try {
        // Fetch prices
        const pricesResponse = await fetch(
          `/api/properties/${propertyId}/daily-prices`,
          { credentials: 'include' }
        )
        const prices = await pricesResponse.json()

        // Filter prices for current month/year and create price map
        const monthPrices = prices.filter((p: { date: string; base_price: number }) => {
          const [year, month] = p.date.split('-').map(Number)
          return year === currentYear && month === currentMonth + 1
        })

        // Convert to ISO date strings for highlighting
        const dateStrings = monthPrices.map((p: { date: string }) => p.date)
        setSelectedDateStr(dateStrings)

        // Create price map for display
        const priceMap: Record<string, number> = {}
        monthPrices.forEach((p: { date: string; base_price: number }) => {
          priceMap[p.date] = p.base_price
        })
        setDailyPrices(priceMap)

        // Fetch reservations
        try {
          const reservationsResponse = await fetch(
            `/api/properties/${propertyId}/reservations`,
            { credentials: 'include' }
          )
          const reservationsData = await reservationsResponse.json()

          console.log('[DEBUG] Reservations fetched:', reservationsData)

          // Filter reservations for current month (including overlapping)
          const monthReservations = (reservationsData.data || []).filter(
            (res: any) => {
              if (!res.start_date || !res.end_date) return false

              const resStart = new Date(res.start_date)
              const resEnd = new Date(res.end_date)
              const monthStart = new Date(currentYear, currentMonth, 1)
              const monthEnd = new Date(currentYear, currentMonth + 1, 0)

              // Show if reservation overlaps with current month
              return resStart <= monthEnd && resEnd >= monthStart
            }
          )

          console.log('[DEBUG] Filtered reservations:', monthReservations)

          setReservations(
            monthReservations.map((res: any) => ({
              id: res.id,
              guestName: res.guest_name || 'Guest',
              guestCount: res.guest_count || 1,
              startDate: new Date(res.start_date),
              endDate: new Date(res.end_date),
              price: res.price_per_night || 0,
              status: res.status || 'pending',
            }))
          )
        } catch (error) {
          console.error('[ERROR] Failed to fetch reservations:', error)
          setReservations([])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setSelectedDateStr([])
        setReservations([])
      }
    }

    fetchDataForMonth()
  }, [propertyId, currentMonth, currentYear])

  // Handle month change - update state
  const handleMonthChange = useCallback(
    (month: number, year: number) => {
      // Update month/year state to trigger price fetch
      setCurrentMonth(month)
      setCurrentYear(year)
      // Clear manual selection when month changes
      selection.clearSelection()
    },
    [selection]
  )

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header with back button - always full width */}
      <div
        className="flex items-center gap-3 p-4 border-b"
        style={{ borderColor: '#E5DFD2', backgroundColor: '#FBFAF6' }}
      >
        <a
          href={`/${locale}/calendar`}
          className="flex items-center gap-2 px-3 py-2 rounded hover:opacity-70 transition-opacity"
          style={{ backgroundColor: '#F7F5EF', color: '#1B2430', textDecoration: 'none' }}
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-semibold">Calendário Hub</span>
        </a>
      </div>

      {/* Grid container for calendar and sidebar */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_450px] gap-0">
        {/* Calendar - Mobile Full Width, Desktop Left */}
        <div className="flex-1 overflow-auto flex flex-col">
          <CalendarComponent
            onDayClick={handleDayClick}
            onRangeSelect={handleRangeSelect}
            selectedDates={getSelectedDateStrings()}
            onMonthChange={handleMonthChange}
            reservations={reservations}
            dailyPrices={dailyPrices}
          />

          {/* Reservations Display - Kanban Style */}
          {reservations.length > 0 && (
            <div className="p-4 border-t" style={{ borderColor: '#E5DFD2', backgroundColor: '#FBFAF6' }}>
              <h3 className="font-bold mb-3" style={{ color: '#1B2430' }}>
                Reservas do Mês
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto pb-2">
                {reservations.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded border min-w-[200px]"
                    style={{
                      backgroundColor: res.status === 'confirmed' ? '#E3F2FD' : '#FFF3E0',
                      borderColor: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
                      color: res.status === 'confirmed' ? '#1976D2' : '#F57C00',
                    }}
                  >
                    <div className="font-semibold text-sm">{res.guestName}</div>
                    <div className="text-xs mt-1">
                      {res.guestCount} {res.guestCount === 1 ? 'hóspede' : 'hóspedes'}
                    </div>
                    <div className="text-sm font-bold mt-1">€{res.price.toFixed(2)}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {res.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
        <div className="md:overflow-auto" style={{ borderTop: '1px solid #E5DFD2', borderLeft: '1px solid #E5DFD2', backgroundColor: '#FBFAF6' }}>
          <SettingsSidebar key={propertyId} propertyId={propertyId} onUpdate={refetchData} />
        </div>
      </div>

      {/* Day Click Modal */}
      <CalendarDayClickModal
        isOpen={selection.isModalOpen}
        dates={selection.modalData?.dates || selection.modalData?.date || null}
        propertyId={propertyId}
        onClose={selection.closeModal}
        onSavePrice={handleSavePrice}
        onBlockDates={handleBlockDates}
      />

      {/* Mobile-specific styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .calendar-container {
            min-height: calc(100vh - 200px);
          }

          .settings-container {
            height: auto;
            max-height: 70vh;
          }
        }

        /* Prevent layout shift on scroll */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
