/**
 * Story 36.9: DetailedCalendar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DetailedCalendar } from '@/components/DetailedCalendar';

// Mock useCalendarMonth hook
jest.mock('@/components/PricingCalendar/hooks/useCalendarMonth', () => ({
  useCalendarMonth: jest.fn(() => ({
    prices: new Map(),
    loading: false,
    error: null,
    setPrice: jest.fn(),
    deletePrice: jest.fn(),
    refetchPrices: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('DetailedCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders component without crashing', () => {
    const { container } = render(<DetailedCalendar propertyId="prop-1" />);
    expect(container).toBeInTheDocument();
  });

  it('accepts propertyId prop', () => {
    const { container } = render(<DetailedCalendar propertyId="test-property" />);
    expect(container).toBeInTheDocument();
  });

  it('accepts isMobile prop', () => {
    const { container } = render(<DetailedCalendar propertyId="prop-1" isMobile={true} />);
    expect(container).toBeInTheDocument();
  });

  it('accepts callback handlers', () => {
    const mockSettings = jest.fn();
    const mockPicker = jest.fn();
    const { container } = render(
      <DetailedCalendar
        propertyId="prop-1"
        onSettingsClick={mockSettings}
        onMonthPickerClick={mockPicker}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with web layout', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={false} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with mobile layout', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={true} />
    );
    expect(container).toBeInTheDocument();
  });
});

describe('DetailedCalendar: reservas por dia de calendário', () => {
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'r1', guestName: 'Maria Teste', checkIn: `${month}-10`, checkOut: `${month}-12` }],
    })
  })

  // Falha com o código antigo em fusos a leste de UTC (ex.: TZ=Europe/Lisbon no verão): a primeira noite sumia.
  it.each([['10', true], ['11', true], ['12', false]])(
    'dia %s mostra a reserva 10→12: %s',
    async (day, shown) => {
      render(<DetailedCalendar propertyId="prop-1" />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalled())
      await new Promise(resolve => setTimeout(resolve, 0))

      fireEvent.click(screen.getAllByText(day)[0].closest('button') as HTMLElement)

      if (shown) {
        await waitFor(() => expect(screen.getAllByText('Maria Teste').length).toBeGreaterThan(0))
      } else {
        expect(screen.queryAllByText('Maria Teste').length).toBe(0)
      }
    }
  )
})
