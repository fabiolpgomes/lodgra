/**
 * Story 36.3: useCalendarMonth Hook Tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarMonth } from '@/components/PricingCalendar/hooks/useCalendarMonth';

global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useCalendarMonth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches prices on mount', async () => {
    const mockPrices = [
      { id: '1', date: '2026-07-15', price: 120, property_id: 'prop-123' },
      { id: '2', date: '2026-07-20', price: 150, property_id: 'prop-123' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6); // July 2026
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/properties/prop-123/daily-prices?month=2026-07'
    );
  });

  it('converts response array to Map', async () => {
    const mockPrices = [
      { id: '1', date: '2026-07-15', price: 120, property_id: 'prop-123' },
      { id: '2', date: '2026-07-20', price: 150, property_id: 'prop-123' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.prices.size).toBe(2);
    });

    expect(result.current.prices.get('2026-07-15')).toEqual(mockPrices[0]);
    expect(result.current.prices.get('2026-07-20')).toEqual(mockPrices[1]);
  });

  it('handles empty price list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prices.size).toBe(0);
  });

  it('sets error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBeDefined();
  });

  it('creates price override', async () => {
    const mockPrices: any[] = [];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock POST response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: '1', date: '2026-07-15', price: 150, property_id: 'prop-123' },
      }),
    } as Response);

    // Call setPrice
    await act(async () => {
      await result.current.setPrice('2026-07-15', 150);
    });

    // Verify POST was called
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/properties/prop-123/daily-prices',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ date: '2026-07-15', price: 150 }),
      })
    );
  });

  it('deletes price override', async () => {
    const mockPrices = [
      { id: '1', date: '2026-07-15', price: 120, property_id: 'prop-123' },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.prices.size).toBe(1);
    });

    // Mock DELETE response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { deleted: true } }),
    } as Response);

    // Mock re-fetch for delete operation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    // Call deletePrice
    await act(async () => {
      await result.current.deletePrice('2026-07-15');
    });

    // Verify DELETE was called
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/properties/prop-123/daily-prices/2026-07-15',
      { method: 'DELETE' }
    );
  });

  it('refetches prices', async () => {
    const mockPrices = [
      { id: '1', date: '2026-07-15', price: 120, property_id: 'prop-123' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = mockFetch.mock.calls.length;

    // Call refetchPrices
    await act(async () => {
      await result.current.refetchPrices();
    });

    // Should have made another fetch call
    expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it('refetches when month prop changes', async () => {
    const mockPrices: any[] = [];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockPrices, success: true }),
    } as Response);

    const month = new Date(2026, 6); // July
    const { result, rerender } = renderHook(
      ({ month: m }) => useCalendarMonth('prop-123', m),
      { initialProps: { month } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const august = new Date(2026, 7);
    rerender({ month: august });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/properties/prop-123/daily-prices?month=2026-08'
      );
    });
  });

  it('handles errors thrown from setPrice', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    const month = new Date(2026, 6);
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mock POST failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed' }),
    } as Response);

    try {
      await act(async () => {
        await result.current.setPrice('2026-07-15', 200);
      });
    } catch (err) {
      // Expected to throw
    }

    // Check that error is set
    expect(result.current.error).toBeDefined();
  });

  it('formats month parameter correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    const month = new Date(2026, 0); // January
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/properties/prop-123/daily-prices?month=2026-01'
    );
  });

  it('handles December month correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);

    const month = new Date(2026, 11); // December
    const { result } = renderHook(() => useCalendarMonth('prop-123', month));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/properties/prop-123/daily-prices?month=2026-12'
    );
  });
});
