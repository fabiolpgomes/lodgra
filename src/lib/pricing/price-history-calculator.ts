/**
 * Story 36.7: Price History & Analytics Utilities
 * Calculate price statistics, revenue impact, and handle price history data
 */

import {
  PriceHistory,
  PriceStatistics,
  RevenueImpactAnalysis,
} from '@/types/pricing.types';

/**
 * Calculate price statistics from price history
 * @param history Array of price history records
 * @returns Statistics object with min, max, average, and standard deviation
 */
export function calculatePriceStats(history: PriceHistory[]): PriceStatistics {
  if (history.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      changeCount: 0,
      stdDeviation: 0,
    };
  }

  const prices = history.map((h) => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;

  // Calculate standard deviation
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
  const stdDeviation = Math.round(Math.sqrt(variance) * 100) / 100;

  return {
    minPrice,
    maxPrice,
    avgPrice,
    changeCount: history.length,
    stdDeviation,
  };
}

/**
 * Calculate revenue impact of price changes
 * @param currentPrice Current price per night
 * @param previousPrice Previous price per night
 * @param estimatedBookings Estimated bookings for the period
 * @returns Revenue impact analysis
 */
export function calculateRevenueImpact(
  currentPrice: number,
  previousPrice: number,
  estimatedBookings: number = 0
): RevenueImpactAnalysis {
  const priceChange = currentPrice - previousPrice;
  const percentageChange =
    previousPrice > 0
      ? Math.round((priceChange / previousPrice) * 10000) / 100
      : 0;
  const estimatedImpact = priceChange * estimatedBookings;

  return {
    priceChange,
    estimatedBookings,
    estimatedImpact,
    percentageChange,
  };
}

/**
 * Get average price for a date range
 * @param history Price history records
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Average price for the period
 */
export function getAveragePriceForRange(
  history: PriceHistory[],
  startDate: string,
  endDate: string
): number {
  const filtered = history.filter((h) => {
    const date = new Date(h.date_applied);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  if (filtered.length === 0) return 0;

  const total = filtered.reduce((sum, h) => sum + h.price, 0);
  return Math.round((total / filtered.length) * 100) / 100;
}

/**
 * Get price change frequency (changes per week)
 * @param history Price history records
 * @returns Average changes per week
 */
export function getPriceChangeFrequency(history: PriceHistory[]): number {
  if (history.length < 2) return 0;

  const oldestRecord = history[history.length - 1];
  const newestRecord = history[0];

  const daysDiff = Math.ceil(
    (new Date(newestRecord.created_at).getTime() -
      new Date(oldestRecord.created_at).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysDiff === 0) return 0;

  const weeks = daysDiff / 7;
  return Math.round((history.length / weeks) * 100) / 100;
}

/**
 * Detect significant price changes (>threshold)
 * @param history Price history records
 * @param threshold Percentage threshold for "significant" (e.g., 10 for 10%)
 * @returns Array of significant price changes
 */
export function detectSignificantPriceChanges(
  history: PriceHistory[],
  threshold: number = 10
): PriceHistory[] {
  if (history.length < 2) return [];

  return history.filter((current, index) => {
    if (index === history.length - 1) return false; // Skip last record

    const previous = history[index + 1];
    const percentageChange = Math.abs(
      ((current.price - previous.price) / previous.price) * 100
    );

    return percentageChange >= threshold;
  });
}

/**
 * Format price for display
 * @param price Price value
 * @param currency Currency code (default: EUR)
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format date for display
 * @param date Date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get price trend direction
 * @param history Price history records
 * @returns 'up' | 'down' | 'stable'
 */
export function getPriceTrend(history: PriceHistory[]): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';

  const oldest = history[history.length - 1].price;
  const newest = history[0].price;

  const percentageChange = ((newest - oldest) / oldest) * 100;

  if (percentageChange > 2) return 'up';
  if (percentageChange < -2) return 'down';
  return 'stable';
}
