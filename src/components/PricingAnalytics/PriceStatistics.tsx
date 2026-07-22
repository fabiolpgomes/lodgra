/**
 * Story 36.7: Price Statistics Component
 * Displays key price metrics and statistics
 */

'use client';

import React from 'react';
import { PriceStatistics } from '@/types/pricing.types';
import { formatPrice } from '@/lib/pricing/price-history-calculator';

interface PriceStatisticsProps {
  stats: PriceStatistics | null;
  loading?: boolean;
}

/**
 * Display price statistics in metric cards
 */
export function PriceStatisticsComponent({
  stats,
  loading = false,
}: PriceStatisticsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-6 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No statistics available</p>
      </div>
    );
  }

  const cards = [
    {
      label: 'Minimum Price',
      value: formatPrice(stats.minPrice),
      icon: '📉',
      color: 'text-green-600',
    },
    {
      label: 'Maximum Price',
      value: formatPrice(stats.maxPrice),
      icon: '📈',
      color: 'text-red-600',
    },
    {
      label: 'Average Price',
      value: formatPrice(stats.avgPrice),
      icon: '📊',
      color: 'text-blue-600',
    },
    {
      label: 'Price Changes',
      value: stats.changeCount.toString(),
      icon: '🔄',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className={`text-2xl font-bold mt-2 ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Standard deviation (if available) */}
      {stats.stdDeviation !== undefined && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">Price Volatility (Std Dev)</p>
          <p className="text-lg font-bold text-blue-700 mt-1">
            {formatPrice(stats.stdDeviation)}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Measures how much prices vary from the average
          </p>
        </div>
      )}
    </div>
  );
}

export default PriceStatisticsComponent;
