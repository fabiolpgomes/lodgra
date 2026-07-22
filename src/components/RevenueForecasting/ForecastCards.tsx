'use client';

import React from 'react';
import { ForecastCard } from './ForecastCard';
import { ForecastingAPIResponse } from '@/types/forecasting';
import { RefreshCw } from 'lucide-react';

interface ForecastCardsProps {
  data: ForecastingAPIResponse | null;
  isLoading: boolean;
  error: string | null;
  onCardClick: (period: '30' | '60' | '90') => void;
  onRefresh: () => void;
}

export function ForecastCards({
  data,
  isLoading,
  error,
  onCardClick,
  onRefresh,
}: ForecastCardsProps) {
  if (error) {
    return (
      <div className="w-full bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200 font-medium mb-2">Error loading forecast</p>
        <p className="text-red-700 dark:text-red-300 text-sm mb-3">{error}</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-200 dark:bg-slate-700 rounded-lg h-48 animate-pulse"
            aria-busy="true"
            aria-label="Loading forecast card"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-blue-800 dark:text-blue-200">No forecast data available</p>
      </div>
    );
  }

  // Calculate total projected revenue
  const totalRevenue =
    data.forecasts.days30.projectedRevenue +
    data.forecasts.days60.projectedRevenue +
    data.forecasts.days90.projectedRevenue;

  return (
    <div className="w-full">
      {/* Summary line */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Total 90-day projection</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            €{totalRevenue.toFixed(2)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 rounded-md transition-colors"
          aria-label="Refresh forecast data"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <ForecastCard
          forecast={data.forecasts.days30}
          period="30"
          onClick={() => onCardClick('30')}
        />
        <ForecastCard
          forecast={data.forecasts.days60}
          period="60"
          onClick={() => onCardClick('60')}
        />
        <ForecastCard
          forecast={data.forecasts.days90}
          period="90"
          onClick={() => onCardClick('90')}
        />
      </div>

      {/* Last updated timestamp */}
      <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Last updated:{' '}
        {data.forecasts.days30.updatedAt
          ? new Date(data.forecasts.days30.updatedAt).toLocaleString()
          : 'Just now'}
      </div>
    </div>
  );
}
