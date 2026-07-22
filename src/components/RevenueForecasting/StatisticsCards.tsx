'use client';

import React from 'react';
import { StatisticCard } from './StatisticCard';
import { ForecastingAPIResponse } from '@/types/forecasting';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatisticsCardsProps {
  data: ForecastingAPIResponse;
}

export function StatisticsCards({ data }: StatisticsCardsProps) {
  // Calculate ADR (Average Daily Rate)
  const adr = data.assumptions.baseRevenue90Days
    ? (data.assumptions.baseRevenue90Days / 90).toFixed(2)
    : '0.00';

  // Get confidence score
  const confidencePercent = (data.forecasts.days30.confidenceScore * 100).toFixed(0);

  // Get occupancy rate
  const occupancyRate = data.forecasts.days30.occupancyRateForecast
    ? (data.forecasts.days30.occupancyRateForecast * 100).toFixed(1)
    : '0.0';

  // Determine trend direction
  const trendValue = data.summary.trendsDescription;
  const isUpward = trendValue.toLowerCase().includes('upward') || trendValue.toLowerCase().includes('increase');
  const isDownward = trendValue.toLowerCase().includes('downward') || trendValue.toLowerCase().includes('decrease');

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <StatisticCard
          label="Average Daily Rate (ADR)"
          value={`€${adr}`}
          explanation="Projected average revenue per night"
          helpText="Based on historical booking data and seasonal adjustments"
        />

        <StatisticCard
          label="Confidence Score"
          value={confidencePercent}
          unit="%"
          explanation={`${data.forecasts.days30.confidenceLevel.toUpperCase()}`}
          helpText={`Based on ${data.assumptions.last90DaysBookings} recent bookings`}
        />

        <StatisticCard
          label="Occupancy Rate Forecast (30D)"
          value={occupancyRate}
          unit="%"
          explanation="Projected occupancy for next 30 days"
          helpText="May vary based on market conditions"
        />

        <StatisticCard
          label="Trend Indicator"
          value={
            isUpward ? '↑ Upward' : isDownward ? '↓ Downward' : '→ Stable'
          }
          icon={
            isUpward ? (
              <TrendingUp className="text-green-600 dark:text-green-400" />
            ) : isDownward ? (
              <TrendingDown className="text-red-600 dark:text-red-400" />
            ) : (
              <Minus className="text-slate-600 dark:text-slate-400" />
            )
          }
          explanation={data.summary.trendsDescription}
          helpText="Based on historical and seasonal patterns"
        />
      </div>
    </div>
  );
}
