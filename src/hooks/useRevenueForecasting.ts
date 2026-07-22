/**
 * Custom hook for revenue forecasting (Story 36.9)
 */

import { useState, useEffect, useCallback } from 'react';
import { ForecastingAPIResponse } from '@/types/forecasting';

export function useRevenueForecasting(propertyId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ForecastingAPIResponse | null>(null);

  const fetchForecasting = useCallback(async () => {
    if (!propertyId) {
      setError('Property ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/analytics/forecasting`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch forecasting data');
      }

      const forecastData: ForecastingAPIResponse = await response.json();
      setData(forecastData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Forecasting fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  // Fetch on mount and when propertyId changes
  useEffect(() => {
    fetchForecasting();
  }, [fetchForecasting]);

  const refresh = useCallback(async () => {
    await fetchForecasting();
  }, [fetchForecasting]);

  return {
    isLoading,
    error,
    data,
    refresh,
  };
}

/**
 * Custom hook for forecasting chart data
 */
export function useForecastingChart(propertyId: string | undefined) {
  const { data, isLoading, error } = useRevenueForecasting(propertyId);

  const chartData = data?.chartData || [];
  const summary = data?.summary;
  const forecasts = data?.forecasts;

  return {
    chartData,
    summary,
    forecasts,
    isLoading,
    error,
  };
}
