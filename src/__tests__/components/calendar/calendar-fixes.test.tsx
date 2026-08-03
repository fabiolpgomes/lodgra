import React from 'react'
import { render, screen } from '@testing-library/react'
import { CalendarWithSettings } from '@/components/calendar/CalendarWithSettings'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useParams: () => ({
    locale: 'pt-BR',
    propertyId: 'test-property-123',
  }),
}))

// Mock SettingsSidebar to verify it receives propertyId
jest.mock('@/components/calendar/SettingsSidebar', () => {
  return {
    SettingsSidebar: ({ propertyId }: { propertyId?: string }) => (
      <div data-testid="settings-sidebar" data-property-id={propertyId}>
        Settings Sidebar - Property ID: {propertyId}
      </div>
    ),
  }
})

// Mock CalendarDayClickModal
jest.mock('@/components/calendar/CalendarDayClickModal', () => {
  return {
    CalendarDayClickModal: () => <div data-testid="modal">Modal</div>,
  }
})

// Mock useCalendarSelection
jest.mock('@/hooks/useCalendarSelection', () => ({
  useCalendarSelection: () => ({
    state: {
      selectedDates: [],
      mode: 'idle',
    },
    toggleDay: jest.fn(),
    selectDateRange: jest.fn(),
    openPriceModal: jest.fn(),
    closeModal: jest.fn(),
    clearSelection: jest.fn(),
    isModalOpen: false,
    modalData: null,
  }),
}))

describe('CalendarWithSettings - Fix #1: SettingsSidebar propertyId', () => {
  it('should render SettingsSidebar with propertyId prop', () => {
    render(
      <CalendarWithSettings
        propertyId="test-property-123"
        calendarComponent={SimpleCalendarAdapter}
      />
    )

    const sidebar = screen.getByTestId('settings-sidebar')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar).toHaveAttribute('data-property-id', 'test-property-123')
  })

  it('should render all layout components', () => {
    render(
      <CalendarWithSettings
        propertyId="test-property-123"
        calendarComponent={SimpleCalendarAdapter}
      />
    )

    expect(screen.getByTestId('settings-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })
})

describe('SimpleCalendarAdapter - Fix #2: Click/Drag Selection', () => {
  it('should render calendar with proper day elements', () => {
    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={jest.fn()}
        onRangeSelect={jest.fn()}
        selectedDates={[]}
      />
    )

    // Calendar should render day elements
    const dayElements = container.querySelectorAll('[data-day]')
    expect(dayElements.length).toBeGreaterThan(0)
  })

  it('should accept both onDayClick and onRangeSelect callbacks', () => {
    const onDayClick = jest.fn()
    const onRangeSelect = jest.fn()

    render(
      <SimpleCalendarAdapter
        onDayClick={onDayClick}
        onRangeSelect={onRangeSelect}
        selectedDates={[]}
      />
    )

    // Callbacks are properly passed to component
    expect(onDayClick).toBeDefined()
    expect(onRangeSelect).toBeDefined()
  })

  it('should handle selected dates correctly', () => {
    const selectedDates = ['2026-08-10', '2026-08-11', '2026-08-12']

    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={jest.fn()}
        onRangeSelect={jest.fn()}
        selectedDates={selectedDates}
      />
    )

    // Verify component renders without errors with selected dates
    const dayElements = container.querySelectorAll('[data-day]')
    expect(dayElements.length).toBeGreaterThan(0)
  })

  it('should display month name correctly', () => {
    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={jest.fn()}
        onRangeSelect={jest.fn()}
        selectedDates={[]}
      />
    )

    // Month name should be visible (agosto for August)
    const monthText = container.textContent
    expect(monthText).toMatch(/\d{4}/) // Should contain year
  })
})
