'use client'

import { useReducer, useCallback, useMemo, useState } from 'react'

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

type SelectionAction =
  | { type: 'TOGGLE_DAY'; date: Date }
  | { type: 'SELECT_RANGE'; start: Date; end: Date }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECTED_CARD'; card: SelectionState['selectedCard'] }

const initialState: SelectionState = {
  mode: 'idle',
  selectedDates: [],
  dateRange: null,
  selectedCard: null,
}

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'TOGGLE_DAY': {
      const dateStr = action.date.toISOString().split('T')[0]
      const isSelected = state.selectedDates.some(
        (d) => d.toISOString().split('T')[0] === dateStr
      )

      if (isSelected) {
        return {
          ...state,
          selectedDates: state.selectedDates.filter(
            (d) => d.toISOString().split('T')[0] !== dateStr
          ),
        }
      }

      return {
        ...state,
        mode: 'single-day',
        selectedDates: [...state.selectedDates, action.date],
      }
    }

    case 'SELECT_RANGE': {
      const dates: Date[] = []
      const current = new Date(action.start.getTime())

      while (current.getTime() <= action.end.getTime()) {
        dates.push(new Date(current.getTime()))
        current.setDate(current.getDate() + 1)
      }

      return {
        ...state,
        mode: 'period',
        selectedDates: dates,
        dateRange: { start: action.start, end: action.end },
      }
    }

    case 'CLEAR_SELECTION':
      return initialState

    case 'SET_SELECTED_CARD':
      return {
        ...state,
        selectedCard: action.card,
      }

    default:
      return state
  }
}

/**
 * Hook para gerenciar seleção de datas no calendário
 * Suporta:
 * - Clique em dia único
 * - Seleção de período (arrastar ou click + click)
 * - Integração com cards de settings
 */
export function useCalendarSelection(propertyId?: string) {
  const [state, dispatch] = useReducer(selectionReducer, initialState)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    card: SelectionState['selectedCard']
    dates?: DateRange
    date?: Date
  } | null>(null)

  // Toggle single day
  const toggleDay = useCallback((date: Date) => {
    dispatch({ type: 'TOGGLE_DAY', date })
  }, [])

  // Select date range (start -> end)
  const selectDateRange = useCallback((start: Date, end: Date) => {
    dispatch({ type: 'SELECT_RANGE', start, end })
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' })
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
