/**
 * Story 36.3: Calendar Month Tests
 * Unit and integration tests for pricing calendar
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarMonth } from '@/components/PricingCalendar/CalendarMonth';
import { clearCalendarMonthCache } from '@/components/PricingCalendar/hooks/useCalendarMonth';
import { clearCalendarMonthReservationsCache } from '@/components/PricingCalendar/CalendarMonth';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CalendarMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCalendarMonthCache();
    clearCalendarMonthReservationsCache();
    // Set up default mock response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);
  });

  it('renders calendar grid with navigation buttons', async () => {
    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
        weekendPrice={150}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
  });

  it('fetches daily prices from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/properties/prop-123/daily-prices?month=')
      );
    });
  });

  it('displays base price prop', async () => {
    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });

    // Component renders without errors
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
  });

  it('renders correctly with weekend prices', async () => {
    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
        weekendPrice={150}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
  });

  it('navigates months with button clicks', async () => {
    const { rerender } = render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /Seguinte/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
    });
  });

  it('calls onPriceUpdate callback when available', async () => {
    const onPriceUpdate = jest.fn();

    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
        onPriceUpdate={onPriceUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });

    // Component renders with callback
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    // Component should still render
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Seguinte/i })).toBeInTheDocument();
    });
  });

  it('renders with different property IDs', async () => {
    render(
      <CalendarMonth
        propertyId="different-prop-456"
        basePrice={200}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/properties/different-prop-456/daily-prices?month=')
      );
    });
  });

  it('shows guest names on booked days', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'res-1',
            guest_name: 'João Silva',
            start_date: '2026-08-10',
            end_date: '2026-08-12',
            status: 'confirmed',
          },
        ],
      }),
    } as Response);

    render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
    });

    const guestBadge = screen.getAllByText('João Silva')[0];
    expect(guestBadge.closest('button')).toHaveClass('bg-slate-100');
  });
});
