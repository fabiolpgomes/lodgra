'use client'

import { useState, useCallback, useMemo } from 'react'

export interface DateRange {
  start: Date
  end: Date
}

export interface SelectionState {
  mode: 'idle' | 'single-day' | 'period'
  selectedDates: Date[]
  dateRange: DateRange | null
  selectedCard: 'prices' | 'discounts' | 'availability' | 'cancellations' | 'taxes' | null
}

/**
 * Hook para gerenciar seleção de datas no calendário
 * Suporta:
 * - Clique em dia único
 * - Seleção de período (arrastar ou click + click)
 * - Integração com cards de settings
 */
export function useCalendarSelection(propertyId?: string) {
  const [state, setState] = useState<SelectionState>({
    mode: 'idle',
    selectedDates: [],
    dateRange: null,
    selectedCard: null,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    card: SelectionState['selectedCard']
    dates?: DateRange
    date?: Date
  } | null>(null)

  // Toggle single day
  const toggleDay = useCallback((date: Date) => {
    setState((prev) => {
      const dateStr = date.toISOString().split('T')[0]
      const isSelected = prev.selectedDates.some(
        (d) => d.toISOString().split('T')[0] === dateStr
      )

      if (isSelected) {
        return {
          ...prev,
          selectedDates: prev.selectedDates.filter(
            (d) => d.toISOString().split('T')[0] !== dateStr
          ),
        }
      }

      return {
        ...prev,
        mode: 'single-day',
        selectedDates: [...prev.selectedDates, date],
      }
    })
  }, [])

  // Select date range (start -> end)
  const selectDateRange = useCallback((start: Date, end: Date) => {
    console.log('[useCalendarSelection.selectDateRange] START:', {
      start: start.toDateString(),
      end: end.toDateString(),
    })

    const dates: Date[] = []
    // Use getTime() to avoid timezone issues when comparing dates
    const current = new Date(start.getTime())

    while (current.getTime() <= end.getTime()) {
      dates.push(new Date(current.getTime()))
      current.setDate(current.getDate() + 1)
    }

    console.log('[useCalendarSelection.selectDateRange] Generated dates:', {
      count: dates.length,
      dates: dates.map(d => d.toISOString().split('T')[0]),
    })

    setState((prev) => {
      console.log('[useCalendarSelection.selectDateRange] setState called with:', {
        datesCount: dates.length,
      })
      return {
        ...prev,
        mode: 'period',
        selectedDates: dates,
        dateRange: { start, end },
      }
    })
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    setState({
      mode: 'idle',
      selectedDates: [],
      dateRange: null,
      selectedCard: null,
    })
    setIsModalOpen(false)
    setModalData(null)
  }, [])

  // Open modal for price editing
  const openPriceModal = useCallback(
    (dates: Date | DateRange) => {
      if (dates instanceof Date) {
        setModalData({
          card: 'prices',
          date: dates,
        })
      } else {
        setModalData({
          card: 'prices',
          dates: dates as DateRange,
        })
      }
      setState((prev) => ({ ...prev, selectedCard: 'prices' }))
      setIsModalOpen(true)
    },
    []
  )

  // Open modal for discount editing
  const openDiscountModal = useCallback((dateRange: DateRange) => {
    setModalData({
      card: 'discounts',
      dates: dateRange,
    })
    setState((prev) => ({ ...prev, selectedCard: 'discounts' }))
    setIsModalOpen(true)
  }, [])

  // Open modal for availability editing
  const openAvailabilityModal = useCallback((dateRange: DateRange) => {
    setModalData({
      card: 'availability',
      dates: dateRange,
    })
    setState((prev) => ({ ...prev, selectedCard: 'availability' }))
    setIsModalOpen(true)
  }, [])

  // Open modal for cancellation policy
  const openCancellationModal = useCallback((dateRange: DateRange) => {
    setModalData({
      card: 'cancellations',
      dates: dateRange,
    })
    setState((prev) => ({ ...prev, selectedCard: 'cancellations' }))
    setIsModalOpen(true)
  }, [])

  // Calculate date range stats
  const stats = useMemo(() => {
    if (state.selectedDates.length === 0) {
      return { nights: 0, startDate: null, endDate: null }
    }

    const sorted = [...state.selectedDates].sort(
      (a, b) => a.getTime() - b.getTime()
    )

    return {
      nights: sorted.length,
      startDate: sorted[0],
      endDate: sorted[sorted.length - 1],
    }
  }, [state.selectedDates])

  return {
    // State
    state,
    stats,
    isModalOpen,
    modalData,

    // Actions
    toggleDay,
    selectDateRange,
    clearSelection,
    openPriceModal,
    openDiscountModal,
    openAvailabilityModal,
    openCancellationModal,
    closeModal: () => {
      setIsModalOpen(false)
      setModalData(null)
    },
  }
}
