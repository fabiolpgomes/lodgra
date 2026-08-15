'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { SettingsSidebar } from './SettingsSidebar'
import { PropertyRail } from './PropertyRail'
import { CalendarDayClickModal } from './CalendarDayClickModal'
import { ReservationDetailsModal } from './ReservationDetailsModal'
import { DiscountSelectionModal } from './DiscountSelectionModal'
import { CancellationPolicyModal } from './CancellationPolicyModal'
import { useCalendarSelection } from '@/hooks/useCalendarSelection'
import {
  useDailyPrices,
  useReservations,
  usePropertyPricing,
  useInvalidateCalendarQueries,
  useBlockedDates,
} from '@/hooks/useCalendarQueries'

interface BlockedDate {
  id: string
  start_date: string
  end_date: string
  notes?: string | null
}

interface CalendarWithSettingsProps {
  propertyId: string
  calendarComponent: React.ComponentType<{
    onDayClick: (day: number, year: number, month: number) => void
    onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
    onReservationClick?: (reservation: Reservation) => void
    selectedDates: string[]
    onMonthChange?: (month: number, year: number) => void
    reservations?: Reservation[]
    dailyPrices?: Record<string, number>
    blockedDates?: BlockedDate[]
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
  currency: string
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

function CalendarWithSettingsContent({
  propertyId,
  calendarComponent: CalendarComponent,
}: CalendarWithSettingsProps) {
  const params = useParams()
  const locale = (params.locale as string) || 'pt-BR'

  const selection = useCalendarSelection(propertyId)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [selectedBlocks, setSelectedBlocks] = useState<BlockedDate[]>([])

  // React Query hooks
  const pricesQuery = useDailyPrices(propertyId, currentYear, currentMonth)
  const reservationsQuery = useReservations(propertyId, currentYear, currentMonth)
  const pricingQuery = usePropertyPricing(propertyId)
  const blockedDatesQuery = useBlockedDates(propertyId, currentYear, currentMonth)
  const invalidateQueries = useInvalidateCalendarQueries()

  // Memoized computed values
  const selectedDateStr = useMemo(() => {
    return selection.state.selectedDates.map((d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })
  }, [selection.state.selectedDates])

  const dailyPrices = useMemo(() => {
    const priceMap: Record<string, number> = {}
    if (pricesQuery.data) {
      pricesQuery.data.forEach((p) => {
        // Use final_price which includes weekend pricing logic
        priceMap[p.date] = p.final_price || p.base_price
      })
    }
    return priceMap
  }, [pricesQuery.data])

  // Helper to parse ISO date strings correctly
  const parseISODate = (dateStr: string | Date): Date => {
    if (dateStr instanceof Date) return dateStr
    if (!dateStr) return new Date()

    // Handle ISO format (YYYY-MM-DD)
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      // Use local timezone to avoid UTC conversion issues
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    // Fallback to native parsing
    return new Date(dateStr)
  }

  const reservations = useMemo(() => {
    if (!reservationsQuery.data?.data) return []

    const transformed = reservationsQuery.data.data.map((res: any) => {
      // Handle both old and new field names from API
      const startStr = res.start_date || res.start || res.check_in
      const endStr = res.end_date || res.end || res.check_out

      // Priority: guest_name → guests.first_name + guests.last_name → first_name → 'Guest'
      let guestName = res.guest_name
      if (!guestName && res.guests) {
        const firstName = res.guests.first_name || ''
        const lastName = res.guests.last_name || ''
        guestName = `${firstName} ${lastName}`.trim()
      }
      if (!guestName) guestName = res.first_name
      if (!guestName) guestName = 'Guest'

      const result = {
        id: res.id,
        guestName: guestName,
        guestCount: res.guest_count || res.number_of_guests || 1,
        startDate: parseISODate(startStr),
        endDate: parseISODate(endStr),
        price: res.price_per_night || res.total_amount || 0,
        currency: res.currency || 'EUR',
        status: res.status || 'pending',
      }

      // Debug log first reservation only
      if (reservationsQuery.data.data.indexOf(res) === 0) {
        console.log('[CalendarWithSettings] First reservation transformed:', {
          raw: res,
          transformed: result,
          guestNameFallback: guestName,
          startCheck: { raw: startStr, parsed: result.startDate.toDateString() },
          endCheck: { raw: endStr, parsed: result.endDate.toDateString() }
        })
      }

      return result
    })

    console.log(`[CalendarWithSettings] Transformed ${transformed.length} reservations`)
    return transformed
  }, [reservationsQuery.data])

  const blockedDates = useMemo(() => {
    if (!blockedDatesQuery.data?.data) return []
    console.log(`[CalendarWithSettings] Loaded ${blockedDatesQuery.data.data.length} blocked date ranges`)
    return blockedDatesQuery.data.data
  }, [blockedDatesQuery.data])

  const formatLocalDate = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const findBlockedDateOverlaps = useCallback((startDate: Date, endDate: Date) => {
    const start = formatLocalDate(startDate)
    const end = formatLocalDate(endDate)
    return blockedDates.filter((block) => block.start_date <= end && block.end_date >= start)
  }, [blockedDates, formatLocalDate])

  // Handle day click from calendar
  const handleDayClick = useCallback(
    (day: number, year: number, month: number) => {
      const clickedDate = new Date(year, month, day)

      // Check if this day is blocked
      const blockOverlaps = findBlockedDateOverlaps(clickedDate, clickedDate)
      if (blockOverlaps.length > 0) {
        setSelectedBlocks(blockOverlaps)
        // Still open modal but with blocked date info
        selection.selectDateRange(clickedDate, clickedDate)
        selection.openPriceModal(clickedDate)
        return
      }

      setSelectedBlocks([])
      selection.toggleDay(clickedDate)
      selection.openPriceModal(clickedDate)
    },
    [selection, findBlockedDateOverlaps]
  )

  // Handle range selection from calendar
  const handleRangeSelect = useCallback(
    (startDay: number, endDay: number, month: number, year: number) => {
      const startDate = new Date(year, month, startDay)
      const endDate = new Date(year, month, endDay)

      // Populate selection state with all dates in range
      selection.selectDateRange(startDate, endDate)
      setSelectedBlocks(findBlockedDateOverlaps(startDate, endDate))

      // Then open modal for price editing
      selection.openPriceModal({
        start: startDate,
        end: endDate,
      })
    },
    [selection, findBlockedDateOverlaps]
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

        // Format dates as local YYYY-MM-DD (not ISO to avoid timezone conversion)
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }

        const formattedStart = formatLocalDate(startDate)
        const formattedEnd = formatLocalDate(endDate)
        console.log('[DEBUG SavePrice] User selected:', startDate.toDateString(), 'to', endDate.toDateString())
        console.log('[DEBUG SavePrice] Formatted dates:', formattedStart, 'to', formattedEnd)

        const payload = {
          startDate: formattedStart,
          endDate: formattedEnd,
          price,
        }
        console.log('[DEBUG SavePrice] Sending payload:', payload)

        const response = await fetch(
          `/api/properties/${propertyId}/pricing/bulk-update`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
    [propertyId, refetchData, selection]
  )

  // Handle block dates from modal
  const handleBlockDates = useCallback(async (reason?: string) => {
    if (selection.state.selectedDates.length === 0) return

    try {
      const startDate = selection.state.selectedDates[0]
      const endDate =
        selection.state.selectedDates[selection.state.selectedDates.length - 1]

      // Format dates as local YYYY-MM-DD (not ISO to avoid timezone conversion)
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      const formattedStart = formatLocalDate(startDate)
      const formattedEnd = formatLocalDate(endDate)
      console.log('[DEBUG BlockDates] User selected:', startDate.toDateString(), 'to', endDate.toDateString())
      console.log('[DEBUG BlockDates] Formatted dates:', formattedStart, 'to', formattedEnd)

      const payload = {
        startDate: formattedStart,
        endDate: formattedEnd,
        reason: reason || 'blocked-by-owner',
      }
      console.log('[DEBUG BlockDates] Sending payload:', payload)

      const response = await fetch(
        `/api/properties/${propertyId}/calendar/block-dates`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
  }, [propertyId, refetchData, selection])

  // Handle unblock dates from modal
  const handleUnblockDates = useCallback(async () => {
    if (selection.state.selectedDates.length === 0 || selectedBlocks.length === 0) return

    try {
      const startDate = formatLocalDate(selection.state.selectedDates[0])
      const endDate = formatLocalDate(selection.state.selectedDates.at(-1)!)
      const responses = await Promise.all(selectedBlocks.map((block) => fetch(
        `/api/properties/${propertyId}/calendar/blocked-dates/${block.id}?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )))

      if (responses.some((response) => !response.ok)) throw new Error('Failed to unblock selected dates')

      selection.clearSelection()
      setSelectedBlocks([])

      // Refetch data in background to confirm
      await refetchData()
    } catch (error) {
      console.error('Error unblocking dates:', error)
      throw error
    }
  }, [formatLocalDate, propertyId, refetchData, selectedBlocks, selection])


  // Handle month change - update state
  const handleMonthChange = useCallback(
    (month: number, year: number) => {
      // Update month/year state to trigger price fetch
      setCurrentMonth(month)
      setCurrentYear(year)
      // NOTE: Don't clear selection here - it was closing modal immediately after drag-select
    },
    []
  )

  // Handle opening discount modal
  const handleOpenDiscounts = useCallback(() => {
    setShowDiscountModal(true)
  }, [])

  // Handle opening cancellation policy modal
  const handleOpenCancellationPolicy = useCallback(() => {
    setShowCancellationModal(true)
  }, [])

  // Handle reservation click - show details modal
  const handleReservationClick = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation)
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
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(0,1fr)_380px] lg:flex lg:flex-row gap-0">
        <PropertyRail activePropertyId={propertyId} locale={locale} />
        {/* Calendar - Mobile Full Width, Desktop Left */}
        <main className="min-w-0 flex-1 overflow-auto flex flex-col bg-white">
          <CalendarComponent
            onDayClick={handleDayClick}
            onRangeSelect={handleRangeSelect}
            onReservationClick={handleReservationClick}
            selectedDates={selectedDateStr}
            onMonthChange={handleMonthChange}
            reservations={reservations}
            dailyPrices={dailyPrices}
            blockedDates={blockedDates}
          />

        </main>

        {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
        <aside className="md:w-[380px] md:overflow-auto lg:w-[390px] lg:flex-none" style={{ borderTop: '1px solid #E5DFD2', borderLeft: '1px solid #E5DFD2', backgroundColor: '#FFFFFF' }}>
          <SettingsSidebar
            key={propertyId}
            propertyId={propertyId}
            calendarMonth={currentMonth}
            calendarYear={currentYear}
            onUpdate={refetchData}
          />
        </aside>
      </div>

      {/* Reservation Details Modal */}
      <ReservationDetailsModal
        isOpen={!!selectedReservation}
        reservation={selectedReservation}
        onClose={() => setSelectedReservation(null)}
      />

      {/* Day Click Modal */}
      <CalendarDayClickModal
        isOpen={selection.isModalOpen}
        dates={selection.modalData?.dates || selection.modalData?.date || null}
        propertyId={propertyId}
        currency={pricingQuery.data?.currency || 'EUR'}
        onClose={() => {
          selection.closeModal()
          setSelectedBlocks([])
        }}
        onSavePrice={handleSavePrice}
        onBlockDates={handleBlockDates}
        onUnblockDates={selectedBlocks.length > 0 ? handleUnblockDates : undefined}
        blockedDateInfo={selectedBlocks.length > 0 ? {
          reason: selectedBlocks[0].notes || 'Bloqueado',
          count: selectedBlocks.length,
        } : null}
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
