'use client'

import { useState, useCallback } from 'react'
import { SettingsSidebar } from './SettingsSidebar'
import { CalendarDayClickModal } from './CalendarDayClickModal'
import { useCalendarSelection } from '@/hooks/useCalendarSelection'

interface CalendarWithSettingsProps {
  propertyId: string
  calendarComponent: React.ComponentType<{
    onDayClick: (day: number, year: number, month: number) => void
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
          selectedDates={getSelectedDateStrings()}
        />
      </div>

      {/* Settings Sidebar - Mobile Bottom Sheet, Desktop Right */}
      <div className="border-t md:border-t-0 md:border-l bg-white md:overflow-auto">
        {/* TEMPORARILY DISABLED FOR DEBUGGING */}
        {/* <SettingsSidebar key={propertyId} /> */}
        <div className="p-4 text-center text-gray-500">Settings disabled for testing</div>
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
