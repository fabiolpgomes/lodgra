'use client'

import { useState, useCallback } from 'react'
import { SettingsSidebar } from './SettingsSidebar'
import { CalendarDayClickModal } from './CalendarDayClickModal'
import { useCalendarSelection } from '@/hooks/useCalendarSelection'

interface CalendarWithSettingsProps {
  propertyId: string
  calendarComponent: React.ComponentType<{
    onDayClick: (day: number, year: number, month: number) => void
    onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
    selectedDates: string[]
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
export function CalendarWithSettings({
  propertyId,
  calendarComponent: CalendarComponent,
}: CalendarWithSettingsProps) {
  const selection = useCalendarSelection(propertyId)
  const [selectedDateStr, setSelectedDateStr] = useState<string[]>([])

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

  return (
    <div className="w-full h-screen flex flex-col md:grid md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_450px] gap-0">
      {/* Calendar - Mobile Full Width, Desktop Left */}
      <div className="flex-1 overflow-auto">
        <CalendarComponent
          onDayClick={handleDayClick}
          onRangeSelect={handleRangeSelect}
          selectedDates={getSelectedDateStrings()}
        />
      </div>

      {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
      <div className="md:overflow-auto" style={{ borderTop: '1px solid #E5DFD2', borderLeft: '1px solid #E5DFD2', backgroundColor: '#FBFAF6' }}>
        <SettingsSidebar key={propertyId} />
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
