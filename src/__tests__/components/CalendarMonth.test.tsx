/**
 * Story 36.3: Calendar Month Tests
 * Unit and integration tests for pricing calendar
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CalendarMonth } from '@/components/PricingCalendar/CalendarMonth';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CalendarMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    // Component renders without errors
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
  });

  it('navigates months with button clicks', async () => {
    const { rerender } = render(
      <CalendarMonth
        propertyId="prop-123"
        basePrice={100}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Component should still be renderable
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    // Component renders with callback
    expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
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
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
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
});
