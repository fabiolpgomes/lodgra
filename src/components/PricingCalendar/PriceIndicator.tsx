/**
 * Story 36.3: Price Indicator Badge
 * Shows visual indicator for price type (base/weekend/override)
 */

import React from 'react';

interface PriceIndicatorProps {
  priceType: 'base' | 'weekend' | 'override' | 'disabled';
  price?: number;
  currency?: string;
}

export function PriceIndicator({
  priceType,
  price,
  currency = 'EUR',
}: PriceIndicatorProps) {
  const getIndicatorColor = (type: string): string => {
    switch (type) {
      case 'override':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'weekend':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'disabled':
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  if (!price) {
    return null;
  }

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-semibold rounded border ${getIndicatorColor(priceType)}`}
    >
      €{price.toFixed(2)}
    </span>
  );
}
