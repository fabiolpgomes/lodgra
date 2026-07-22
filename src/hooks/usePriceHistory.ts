/**
 * Story 36.7: Price History Hook
 * Manage fetching and state for price history data
 */

import { useState, useCallback, useEffect } from 'react';
import {
  PriceHistory,
  PriceHistoryResponse,
  HistoryFiltersPayload,
} from '@/types/pricing.types';

interface UsePriceHistoryOptions {
  propertyId: string;
  page?: number;
  limit?: number;
}

interface UsePriceHistoryState {
  data: PriceHistory[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Hook to fetch and manage price history
 */
export function usePriceHistory({
  propertyId,
  page = 1,
  limit = 50,
}: UsePriceHistoryOptions) {
  const [state, setState] = useState<UsePriceHistoryState>({
    data: [],
    loading: true,
    error: null,
    total: 0,
    page,
    limit,
    hasMore: false,
  });

  const fetch = useCallback(
    async (filters?: HistoryFiltersPayload) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const url = filters
          ? `/api/properties/${propertyId}/price-history`
          : `/api/properties/${propertyId}/price-history?page=${page}&limit=${limit}`;

        const res = await globalThis.fetch(url, {
          method: filters ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: filters ? JSON.stringify({ ...filters, page, limit }) : undefined,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch price history: ${res.statusText}`);
        }

        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        const responseData = result.data as PriceHistoryResponse;
        setState({
          data: responseData.data,
          loading: false,
          error: null,
          total: responseData.total,
          page: responseData.page,
          limit: responseData.limit,
          hasMore: responseData.hasMore,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    },
    [propertyId, page, limit]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const loadMore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: prev.page + 1,
    }));
    fetch({ page: state.page + 1, limit });
  }, [fetch, state.page, limit]);

  const applyFilters = useCallback(
    async (filters: HistoryFiltersPayload) => {
      await fetch({ ...filters, page: 1, limit });
    },
    [fetch, limit]
  );

  return {
    ...state,
    fetch,
    loadMore,
    applyFilters,
  };
}

/**
 * Hook to fetch price statistics
 */
export function usePriceHistoryStats(propertyId: string, days?: number) {
  const [stats, setStats] = useState<{
    data: null | {
      minPrice: number;
      maxPrice: number;
      avgPrice: number;
      changeCount: number;
      stdDeviation?: number;
    };
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = `/api/properties/${propertyId}/price-history/stats${days ? `?days=${days}` : ''}`;
        const res = await globalThis.fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch statistics: ${res.statusText}`);
        }

        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        setStats({
          data: result.data,
          loading: false,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setStats((prev) => ({ ...prev, loading: false, error: message }));
      }
    };

    fetchStats();
  }, [propertyId, days]);

  return stats;
}

/**
 * Hook to fetch price analytics
 */
export function usePriceAnalytics(propertyId: string, period?: number) {
  const [analytics, setAnalytics] = useState<{
    data: any[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const url = `/api/properties/${propertyId}/price-history/analytics${period ? `?period=${period}` : ''}`;
        const res = await globalThis.fetch(url);

        if (!res.ok) {
          throw new Error(`Failed to fetch analytics: ${res.statusText}`);
        }

        const result = await res.json();

        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        setAnalytics({
          data: result.data,
          loading: false,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setAnalytics((prev) => ({ ...prev, loading: false, error: message }));
      }
    };

    fetchAnalytics();
  }, [propertyId, period]);

  return analytics;
}
