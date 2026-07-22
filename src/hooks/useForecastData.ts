'use client';

import { useEffect, useState, useCallback } from 'react';
import { ForecastingAPIResponse, ForecastingHookData } from '@/types/forecasting';

const CACHE_KEY_PREFIX = 'forecast_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: ForecastingAPIResponse;
  timestamp: number;
}

export function useForecastData(propertyId: string): ForecastingHookData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ForecastingAPIResponse | null>(null);

  const getCacheKey = useCallback(() => `${CACHE_KEY_PREFIX}${propertyId}`, [propertyId]);

  const fetchForecastData = useCallback(async (skipCache = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const cacheKey = getCacheKey();

      // Try to get from cache if not skipping
      if (!skipCache && typeof window !== 'undefined') {
        try {
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            const parsedCache: CacheEntry = JSON.parse(cachedData);
            const now = Date.now();

            if (now - parsedCache.timestamp < CACHE_DURATION) {
              setData(parsedCache.data);
              setIsLoading(false);
              return;
            }
          }
        } catch (cacheError) {
          // Silently fail cache retrieval
          console.debug('Cache retrieval failed:', cacheError);
        }
      }

      // Fetch from API
      const response = await fetch(
        `/api/properties/${propertyId}/analytics/forecasting`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? 'Forecast data not available for this property'
            : 'Failed to fetch forecast data'
        );
      }

      const forecastData: ForecastingAPIResponse = await response.json();
      setData(forecastData);

      // Cache the data
      if (typeof window !== 'undefined') {
        try {
          const cacheEntry: CacheEntry = {
            data: forecastData,
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
        } catch (cacheError) {
          // Silently fail cache storage
          console.debug('Cache storage failed:', cacheError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, getCacheKey]);

  // Fetch data on mount
  useEffect(() => {
    fetchForecastData();
  }, [propertyId, fetchForecastData]);

  const refresh = useCallback(async () => {
    await fetchForecastData(true); // Skip cache on refresh
  }, [fetchForecastData]);

  return {
    isLoading,
    error,
    data,
    refresh,
  };
}
