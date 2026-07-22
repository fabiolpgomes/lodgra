'use client';

import React from 'react';
import { RevenueForecast } from '@/types/forecasting';
import { ChevronRight } from 'lucide-react';

interface ForecastCardProps {
  forecast: RevenueForecast;
  period: '30' | '60' | '90';
  onClick: () => void;
}

export function ForecastCard({ forecast, period, onClick }: ForecastCardProps) {
  const confidenceColors = {
    low: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800',
    medium: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800',
    high: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-200 border-green-200 dark:border-green-800',
  };

  const changePercentage =
    forecast.projectedRevenue > 0 ? ((forecast.projectedRevenue / 1000) * 100) % 100 : 0;
  const isPositive = changePercentage >= 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 md:p-6 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-95 text-left"
      aria-label={`${period} day forecast: €${forecast.projectedRevenue.toFixed(2)}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {period} Days
        </h3>
        <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
      </div>

      {/* Revenue */}
      <div className="mb-4">
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Projected Revenue</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          €{forecast.projectedRevenue.toFixed(2)}
        </p>
      </div>

      {/* Change indicator */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
            isPositive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          }`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(changePercentage).toFixed(1)}%
        </span>
      </div>

      {/* Confidence badge */}
      <div
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${
          confidenceColors[forecast.confidenceLevel]
        }`}
      >
        {forecast.confidenceLevel.charAt(0).toUpperCase() + forecast.confidenceLevel.slice(1)} (
        {(forecast.confidenceScore * 100).toFixed(0)}%)
      </div>
    </button>
  );
}
