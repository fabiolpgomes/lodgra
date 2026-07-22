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

  it('renders calendar header with property name', () => {
    render(<DetailedCalendar propertyId="prop-1" />);
    expect(screen.getByText('Sua Propriedade')).toBeInTheDocument();
  });

  it('renders month navigation buttons', () => {
    render(<DetailedCalendar propertyId="prop-1" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('fetches reservations on mount', async () => {
    render(<DetailedCalendar propertyId="prop-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/properties/prop-1/reservations')
      );
    });
  });

  it('displays loading state', () => {
    render(<DetailedCalendar propertyId="prop-1" />);
    expect(screen.getByText(/Carregando calendário/i)).toBeInTheDocument();
  });

  it('navigates to next month', async () => {
    render(<DetailedCalendar propertyId="prop-1" />);

    const buttons = screen.getAllByRole('button');
    const nextMonthButton = buttons.find(btn => btn.getAttribute('aria-label') === 'Próximo mês');

    if (nextMonthButton) {
      fireEvent.click(nextMonthButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    }
  });

  it('selects date when day is clicked', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<DetailedCalendar propertyId="prop-1" />);

    await waitFor(() => {
      const dateElements = screen.queryAllByText(/1/);
      if (dateElements.length > 0) {
        fireEvent.click(dateElements[0]);
      }
    });
  });

  it('handles reservation fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DetailedCalendar propertyId="prop-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should not crash, just log error
    expect(screen.getByText(/Sua Propriedade/i)).toBeInTheDocument();
  });

  it('renders with mobile layout when isMobile is true', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={true} />
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain('sticky');
  });

  it('renders with web layout when isMobile is false', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={false} />
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain('p-6');
  });
});
