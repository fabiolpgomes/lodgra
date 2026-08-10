'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { SettingsSidebar } from './SettingsSidebar'
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
  start_date: string
  end_date: string
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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [clickedBlockId, setClickedBlockId] = useState<string | null>(null)

  // React Query hooks
  const pricesQuery = useDailyPrices(propertyId, currentYear, currentMonth)
  const reservationsQuery = useReservations(propertyId, currentYear, currentMonth)
  const pricingQuery = usePropertyPricing(propertyId)
  const blockedDatesQuery = useBlockedDates(propertyId, currentYear, currentMonth)
  const invalidateQueries = useInvalidateCalendarQueries()

  // Memoized computed values
  const selectedDateStr = useMemo(() => {
    return selection.state.selectedDates.map((d) => d.toISOString().split('T')[0])
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

  // Helper to find if clicked dates overlap with blocked dates
  const findBlockedDateOverlap = useCallback((day: number): { id: string; reason: string } | null => {
    if (blockedDates.length === 0) return null

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const overlap = blockedDatesQuery.data?.data?.find((block: any) => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })

    if (overlap) {
      return {
        id: overlap.id,
        reason: overlap.notes || 'Bloqueado',
      }
    }

    return null
  }, [blockedDates, blockedDatesQuery.data, currentYear, currentMonth])

  // Handle day click from calendar
  const handleDayClick = useCallback(
    (day: number, year: number, month: number) => {
      const clickedDate = new Date(year, month, day)

      // Check if this day is blocked
      const blockOverlap = findBlockedDateOverlap(day)
      if (blockOverlap) {
        setClickedBlockId(blockOverlap.id)
        // Still open modal but with blocked date info
        selection.selectDateRange(clickedDate, clickedDate)
        selection.openPriceModal(clickedDate)
        return
      }

      selection.toggleDay(clickedDate)
      selection.openPriceModal(clickedDate)
    },
    [selection, findBlockedDateOverlap]
  )

  // Handle range selection from calendar
  const handleRangeSelect = useCallback(
    (startDay: number, endDay: number, month: number, year: number) => {
      const startDate = new Date(year, month, startDay)
      const endDate = new Date(year, month, endDay)

      // Populate selection state with all dates in range
      selection.selectDateRange(startDate, endDate)

      // Then open modal for price editing
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
  const handleBlockDates = useCallback(async (reason?: string) => {
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
            reason: reason || 'blocked-by-owner',
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

  // Handle unblock dates from modal
  const handleUnblockDates = useCallback(async (blockId: string) => {
    try {
      const response = await fetch(
        `/api/properties/${propertyId}/calendar/blocked-dates/${blockId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to unblock dates')
      }

      selection.clearSelection()

      // Refetch data in background to confirm
      await refetchData()
    } catch (error) {
      console.error('Error unblocking dates:', error)
      throw error
    }
  }, [propertyId, refetchData, selection])


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
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_450px] gap-0">
        {/* Calendar - Mobile Full Width, Desktop Left */}
        <div className="flex-1 overflow-auto flex flex-col">
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

        </div>

        {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
        <div className="md:overflow-auto" style={{ borderTop: '1px solid #E5DFD2', borderLeft: '1px solid #E5DFD2', backgroundColor: '#FBFAF6' }}>
          <SettingsSidebar key={propertyId} propertyId={propertyId} onUpdate={refetchData} />
        </div>
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
        onClose={() => {
          selection.closeModal()
          setClickedBlockId(null)
        }}
        onSavePrice={handleSavePrice}
        onBlockDates={handleBlockDates}
        onUnblockDates={clickedBlockId ? () => handleUnblockDates(clickedBlockId) : undefined}
        blockedDateInfo={clickedBlockId ? findBlockedDateOverlap(selection.state.selectedDates[0]?.getDate() || 1) : null}
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
