/**
 * Story 36.5: Bulk Pricing Operation Hook Tests
 * Unit tests for bulk operation management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBulkPricingOperation } from '@/hooks/useBulkPricingOperation';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useBulkPricingOperation', () => {
  const propertyId = 'prop-123';
  const mockCallback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], success: true }),
    } as Response);
  });

  it('initializes with correct state', () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('calculates affected dates correctly', () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-05');

    const dates = result.current.getAffectedDates(startDate, endDate);

    expect(dates).toHaveLength(5);
    expect(dates[0]).toBe('2026-07-01');
    expect(dates[4]).toBe('2026-07-05');
  });

  it('calculates single day correctly', () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const date = new Date('2026-07-01');
    const dates = result.current.getAffectedDates(date, date);

    expect(dates).toHaveLength(1);
    expect(dates[0]).toBe('2026-07-01');
  });

  it('applies bulk price operation', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'price' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      price: 150,
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await result.current.applyBulkPrice(config);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/properties/prop-123/daily-prices/bulk'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('applies bulk discount operation', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'discount' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      discountPercent: 10,
      propertyId,
      currentPrices: new Map([
        ['2026-07-01', { date: '2026-07-01', price: 100, property_id: propertyId }],
        ['2026-07-02', { date: '2026-07-02', price: 100, property_id: propertyId }],
        ['2026-07-03', { date: '2026-07-03', price: 100, property_id: propertyId }],
      ]),
    };

    await act(async () => {
      await result.current.applyBulkDiscount(config);
    });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('bulk deletes price overrides', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'delete' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await result.current.bulkDeleteOverrides(config);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/properties/prop-123/daily-prices/bulk'),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'price' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      price: 150,
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await expect(result.current.applyBulkPrice(config)).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('requires price for bulk price operation', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'price' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await expect(result.current.applyBulkPrice(config as any)).rejects.toThrow(
        /Price is required/
      );
    });
  });

  it('requires discount percent for bulk discount operation', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'discount' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await expect(result.current.applyBulkDiscount(config as any)).rejects.toThrow(
        /Discount percent is required/
      );
    });
  });

  it('can undo operations', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'price' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      price: 150,
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await result.current.applyBulkPrice(config);
    });

    expect(result.current.canUndo).toBe(true);

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.canUndo).toBe(false);
  });

  it('maintains operation history limit of 5', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    // Apply 6 operations
    for (let i = 0; i < 6; i++) {
      const config = {
        operationType: 'price' as const,
        startDate: new Date(`2026-07-0${(i % 9) + 1}`),
        endDate: new Date(`2026-07-0${(i % 9) + 1}`),
        price: 150 + i,
        propertyId,
        currentPrices: new Map(),
      };

      await act(async () => {
        await result.current.applyBulkPrice(config);
      });
    }

    // Only last 5 should be available for undo
    let undoCount = 0;
    while (result.current.canUndo && undoCount < 6) {
      await act(async () => {
        await result.current.undo();
      });
      undoCount++;
    }

    expect(undoCount).toBeLessThanOrEqual(5);
  });

  it('calls callback on price update', async () => {
    const { result } = renderHook(() =>
      useBulkPricingOperation(propertyId, mockCallback)
    );

    const config = {
      operationType: 'price' as const,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-03'),
      price: 150,
      propertyId,
      currentPrices: new Map(),
    };

    await act(async () => {
      await result.current.applyBulkPrice(config);
    });

    expect(mockCallback).toHaveBeenCalled();
  });
});
