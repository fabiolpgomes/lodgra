/**
 * Story 36.2: Pricing settings API hook
 * Handles all pricing configuration API calls
 */

import { useCallback, useState } from 'react';
import {
  ApiResponse,
  PropertyPrices,
  PropertyDiscount,
  PropertyAvailability,
} from '@/types/pricing.types';

export function usePricingSettings(propertyId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current prices
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/properties/${propertyId}/prices`);
      if (!res.ok) throw new Error('Failed to fetch prices');
      return (await res.json()) as ApiResponse<PropertyPrices>;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Update prices
  const updatePrices = useCallback(
    async (basePrice: number, weekendPrice?: number) => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/properties/${propertyId}/prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base_price: basePrice, weekend_price: weekendPrice }),
        });
        if (!res.ok) throw new Error('Failed to update prices');
        return (await res.json()) as ApiResponse<PropertyPrices>;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  // Fetch discounts
  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/properties/${propertyId}/discounts`);
      if (!res.ok) throw new Error('Failed to fetch discounts');
      return (await res.json()) as ApiResponse<PropertyDiscount[]>;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Update/create discount
  const updateDiscount = useCallback(
    async (discountType: string, percentage: number, minNights?: number) => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/properties/${propertyId}/discounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discount_type: discountType,
            percentage,
            min_nights: minNights,
          }),
        });
        if (!res.ok) throw new Error('Failed to update discount');
        return (await res.json()) as ApiResponse<PropertyDiscount>;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  // Fetch availability
  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/properties/${propertyId}/availability`);
      if (!res.ok) throw new Error('Failed to fetch availability');
      return (await res.json()) as ApiResponse<PropertyAvailability>;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  // Update availability
  const updateAvailability = useCallback(
    async (data: {
      minNights?: number;
      maxNights?: number;
      advanceNoticeDays?: number;
      noticeForSameDay?: string;
      preparationDays?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/properties/${propertyId}/availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            min_nights: data.minNights,
            max_nights: data.maxNights,
            advance_notice_days: data.advanceNoticeDays,
            notice_for_same_day: data.noticeForSameDay,
            preparation_days: data.preparationDays,
          }),
        });
        if (!res.ok) throw new Error('Failed to update availability');
        return (await res.json()) as ApiResponse<PropertyAvailability>;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [propertyId]
  );

  return {
    loading,
    error,
    fetchPrices,
    updatePrices,
    fetchDiscounts,
    updateDiscount,
    fetchAvailability,
    updateAvailability,
  };
}
