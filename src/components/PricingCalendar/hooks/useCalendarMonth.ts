/**
 * Story 36.3: Calendar month hook
 * Handles fetching and managing daily prices for a specific month
 */

import { useEffect, useState, useCallback } from 'react';
import { DailyPrice } from '@/types/calendar.types';

interface UseCalendarMonthReturn {
  prices: Map<string, DailyPrice>;
  loading: boolean;
  error: Error | null;
  setPrice: (date: string, price: number) => Promise<void>;
  deletePrice: (date: string) => Promise<void>;
  refetchPrices: () => Promise<void>;
}

export function useCalendarMonth(
  propertyId: string,
  month: Date
): UseCalendarMonthReturn {
  const [prices, setPrices] = useState<Map<string, DailyPrice>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Format month as YYYY-MM
  const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/properties/${propertyId}/daily-prices?month=${monthStr}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch daily prices');
      }

      const response = await res.json();
      const data = response.data || response;

      // Convert array to Map
      const priceMap = new Map<string, DailyPrice>();
      if (Array.isArray(data)) {
        data.forEach((price: DailyPrice) => {
          priceMap.set(price.date, price);
        });
      }

      setPrices(priceMap);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching daily prices:', error);
    } finally {
      setLoading(false);
    }
  }, [propertyId, monthStr]);

  // Fetch on mount and when month changes
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const setPrice = useCallback(
    async (date: string, price: number) => {
      // Store original price for rollback
      const originalPrice = prices.get(date);

      try {
        // Optimistic update
        setPrices((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(date) || { date, price: 0, property_id: propertyId };
          updated.set(date, { ...existing, date, price });
          return updated;
        });

        const res = await fetch(`/api/properties/${propertyId}/daily-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, price }),
        });

        if (!res.ok) {
          throw new Error('Failed to save price');
        }

        const response = await res.json();
        if (response.data) {
          setPrices((prev) => {
            const updated = new Map(prev);
            updated.set(date, response.data);
            return updated;
          });
        }
      } catch (err) {
        // Rollback on error
        setPrices((prev) => {
          const updated = new Map(prev);
          if (originalPrice) {
            updated.set(date, originalPrice);
          } else {
            updated.delete(date);
          }
          return updated;
        });

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [propertyId, prices]
  );

  const deletePrice = useCallback(
    async (date: string) => {
      try {
        // Optimistic update
        setPrices((prev) => {
          const updated = new Map(prev);
          updated.delete(date);
          return updated;
        });

        const res = await fetch(
          `/api/properties/${propertyId}/daily-prices/${date}`,
          { method: 'DELETE' }
        );

        if (!res.ok) {
          throw new Error('Failed to delete price');
        }
      } catch (err) {
        // Refetch on error to restore state
        await fetchPrices();

        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [propertyId, fetchPrices]
  );

  return {
    prices,
    loading,
    error,
    setPrice,
    deletePrice,
    refetchPrices: fetchPrices,
  };
}
