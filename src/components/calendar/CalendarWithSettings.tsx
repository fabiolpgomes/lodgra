'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { SettingsSidebar } from './SettingsSidebar'
import { CalendarDayClickModal } from './CalendarDayClickModal'
import { ReservationsList } from './ReservationsList'
import { DiscountSelectionModal } from './DiscountSelectionModal'
import { CancellationPolicyModal } from './CancellationPolicyModal'
import { useCalendarSelection } from '@/hooks/useCalendarSelection'
import {
  useDailyPrices,
  useReservations,
  useInvalidateCalendarQueries,
} from '@/hooks/useCalendarQueries'

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

function CalendarWithSettingsContent({
  propertyId,
  calendarComponent: CalendarComponent,
}: CalendarWithSettingsProps) {
  const router = useRouter()
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const selection = useCalendarSelection(propertyId)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCancellationModal, setShowCancellationModal] = useState(false)

  // React Query hooks
  const pricesQuery = useDailyPrices(propertyId, currentYear, currentMonth)
  const reservationsQuery = useReservations(propertyId, currentYear, currentMonth)
  const invalidateQueries = useInvalidateCalendarQueries()

  // Memoized computed values
  const selectedDateStr = useMemo(() => {
    return selection.state.selectedDates.map((d) => d.toISOString().split('T')[0])
  }, [selection.state.selectedDates])

  const dailyPrices = useMemo(() => {
    const priceMap: Record<string, number> = {}
    if (pricesQuery.data) {
      pricesQuery.data.forEach((p) => {
        priceMap[p.date] = p.base_price
      })
    }
    return priceMap
  }, [pricesQuery.data])

  const reservations = useMemo(() => {
    if (!reservationsQuery.data?.data) return []
    return reservationsQuery.data.data.map((res: any) => ({
      id: res.id,
      guestName: res.guest_name || 'Guest',
      guestCount: res.guest_count || 1,
      startDate: new Date(res.start_date),
      endDate: new Date(res.end_date),
      price: res.price_per_night || 0,
      status: res.status || 'pending',
    }))
  }, [reservationsQuery.data])

  // Handle day click from calendar
  const handleDayClick = useCallback(
    (day: number, year: number, month: number) => {
      const clickedDate = new Date(year, month, day)
      selection.toggleDay(clickedDate)
      selection.openPriceModal(clickedDate)
    },
    [selection]
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
    [selection]
  )

  // Refetch with React Query invalidation
  const refetchData = useCallback(async () => {
    invalidateQueries(propertyId, currentYear, currentMonth)
  }, [propertyId, currentYear, currentMonth, invalidateQueries])

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

        // Refetch data in background to confirm
        await refetchData()
      } catch (error) {
        console.error('Error saving price:', error)
        // Revert optimistic update on error
        await refetchData()
        throw error
      }
    },
    [propertyId, refetchData, dailyPrices]
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

      // Refetch data in background to confirm
      await refetchData()
    } catch (error) {
      console.error('Error blocking dates:', error)
      throw error
    }
  }, [propertyId, refetchData])


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

  // Handle opening discount modal
  const handleOpenDiscounts = useCallback(() => {
    setShowDiscountModal(true)
  }, [])

  // Handle opening cancellation policy modal
  const handleOpenCancellationPolicy = useCallback(() => {
    setShowCancellationModal(true)
  }, [])

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
            selectedDates={selectedDateStr}
            onMonthChange={handleMonthChange}
            reservations={reservations}
            dailyPrices={dailyPrices}
          />

          {/* Reservations Display with Pagination */}
          <ReservationsList
            reservations={reservations}
            monthName={['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
              'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][currentMonth]}
            year={currentYear}
          />
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
        onOpenDiscounts={handleOpenDiscounts}
        onOpenCancellationPolicy={handleOpenCancellationPolicy}
      />

      {/* Discount Selection Modal */}
      <DiscountSelectionModal
        isOpen={showDiscountModal}
        selectedDates={selection.state.selectedDates}
        propertyId={propertyId}
        discounts={[]}
        onClose={() => setShowDiscountModal(false)}
        onApply={async () => {
          await refetchData()
        }}
      />

      {/* Cancellation Policy Modal */}
      <CancellationPolicyModal
        isOpen={showCancellationModal}
        selectedDates={selection.state.selectedDates}
        propertyId={propertyId}
        policies={[]}
        onClose={() => setShowCancellationModal(false)}
        onApply={async () => {
          await refetchData()
        }}
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

// Wrapper with QueryClientProvider
const queryClient = new QueryClient()

export function CalendarWithSettings(
  props: CalendarWithSettingsProps
) {
  return (
    <QueryClientProvider client={queryClient}>
      <CalendarWithSettingsContent {...props} />
    </QueryClientProvider>
  )
}
