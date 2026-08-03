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

  // Convert selection to date strings for calendar highlighting
  const getSelectedDateStrings = useCallback(() => {
    return selection.state.selectedDates.map((d) => d.toISOString().split('T')[0])
  }, [selection.state.selectedDates])

  // Handle day click from calendar
  const handleDayClick = useCallback(
    (day: number, year: number, month: number) => {
      const clickedDate = new Date(year, month, day)

      // Toggle single day
      selection.toggleDay(clickedDate)
      setSelectedDateStr(getSelectedDateStrings())

      // Auto-open modal for single day
      if (selection.state.mode === 'idle') {
        setTimeout(() => {
          selection.openPriceModal(clickedDate)
        }, 100)
      }
    },
    [selection, getSelectedDateStrings]
  )

  // Handle range selection from calendar
  const handleRangeSelect = useCallback(
    (startDay: number, endDay: number, month: number, year: number) => {
      const startDate = new Date(year, month, startDay)
      const endDate = new Date(year, month, endDay)

      // Select date range
      selection.selectDateRange(startDate, endDate)
      setSelectedDateStr(getSelectedDateStrings())

      // Auto-open modal for date range
      setTimeout(() => {
        selection.openPriceModal({
          start: startDate,
          end: endDate,
        })
      }, 100)
    },
    [selection, getSelectedDateStrings]
  )

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
          }
        )

        if (!response.ok) {
          throw new Error('Failed to save price')
        }

        selection.clearSelection()
        setSelectedDateStr([])
      } catch (error) {
        console.error('Error saving price:', error)
        throw error
      }
    },
    [propertyId, selection]
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
  }, [propertyId, selection])

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

        // Filter prices for current month/year
        const monthPrices = prices.filter((p: { date: string; base_price: number }) => {
          const [year, month] = p.date.split('-').map(Number)
          return year === currentYear && month === currentMonth + 1
        })

        // Convert to ISO date strings
        const dateStrings = monthPrices.map((p: { date: string }) => p.date)
        setSelectedDateStr(dateStrings)

        // Fetch reservations
        const reservationsResponse = await fetch(
          `/api/properties/${propertyId}/reservations`,
          { credentials: 'include' }
        )
        const reservationsData = await reservationsResponse.json()

        // Filter reservations for current month
        const monthReservations = (reservationsData.data || []).filter(
          (res: any) => {
            const resStartMonth = new Date(res.start_date).getMonth()
            const resStartYear = new Date(res.start_date).getFullYear()
            const resEndMonth = new Date(res.end_date).getMonth()
            const resEndYear = new Date(res.end_date).getFullYear()

            // Show reservation if it overlaps with current month
            return (
              (resStartYear === currentYear && resStartMonth === currentMonth) ||
              (resEndYear === currentYear && resEndMonth === currentMonth) ||
              (resStartYear < currentYear ||
                (resStartYear === currentYear && resStartMonth < currentMonth)) &&
                (resEndYear > currentYear ||
                  (resEndYear === currentYear && resEndMonth > currentMonth))
            )
          }
        )

        setReservations(
          monthReservations.map((res: any) => ({
            id: res.id,
            guestName: res.guest_name,
            guestCount: res.guest_count,
            startDate: new Date(res.start_date),
            endDate: new Date(res.end_date),
            price: res.price_per_night,
            status: res.status,
          }))
        )
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
        <button
          onClick={() => router.push(`/${locale}/calendar`)}
          className="flex items-center gap-2 px-3 py-2 rounded hover:opacity-70 transition-opacity"
          style={{ backgroundColor: '#F7F5EF', color: '#1B2430' }}
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-semibold">Calendário Hub</span>
        </button>
      </div>

      {/* Grid container for calendar and sidebar */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_450px] gap-0">
        {/* Calendar - Mobile Full Width, Desktop Left */}
        <div className="flex-1 overflow-auto">
          <CalendarComponent
            onDayClick={handleDayClick}
            onRangeSelect={handleRangeSelect}
            selectedDates={getSelectedDateStrings()}
            onMonthChange={handleMonthChange}
            reservations={reservations}
          />
        </div>

        {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
        <div className="md:overflow-auto" style={{ borderTop: '1px solid #E5DFD2', borderLeft: '1px solid #E5DFD2', backgroundColor: '#FBFAF6' }}>
          <SettingsSidebar key={propertyId} propertyId={propertyId} />
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
