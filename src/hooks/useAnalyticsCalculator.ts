/**
 * Story 36.7: Analytics Calculator Hook
 * Calculate statistics and metrics from price history
 */

import { useMemo } from 'react';
import {
  PriceHistory,
  PriceStatistics,
  RevenueImpactAnalysis,
} from '@/types/pricing.types';
import {
  calculatePriceStats,
  calculateRevenueImpact,
  getPriceChangeFrequency,
  detectSignificantPriceChanges,
  getPriceTrend,
} from '@/lib/pricing/price-history-calculator';

interface AnalyticsResult {
  stats: PriceStatistics;
  trend: 'up' | 'down' | 'stable';
  frequency: number;
  significantChanges: PriceHistory[];
  revenueImpact: RevenueImpactAnalysis | null;
}

/**
 * Hook to calculate analytics from price history
 */
export function useAnalyticsCalculator(
  history: PriceHistory[],
  estimatedBookings?: number,
  significanceThreshold?: number
): AnalyticsResult {
  return useMemo(() => {
    const stats = calculatePriceStats(history);
    const trend = getPriceTrend(history);
    const frequency = getPriceChangeFrequency(history);
    const significantChanges = detectSignificantPriceChanges(
      history,
      significanceThreshold || 10
    );

    let revenueImpact: RevenueImpactAnalysis | null = null;
    if (history.length >= 2) {
      const currentPrice = history[0].price;
      const previousPrice = history[1].price;
      revenueImpact = calculateRevenueImpact(
        currentPrice,
        previousPrice,
        estimatedBookings || 0
      );
    }

    return {
      stats,
      trend,
      frequency,
      significantChanges,
      revenueImpact,
    };
  }, [history, estimatedBookings, significanceThreshold]);
}

/**
 * Hook to calculate price change statistics
 */
export function usePriceChangeAnalysis(history: PriceHistory[]) {
  return useMemo(() => {
    if (history.length < 2) {
      return {
        totalChanges: 0,
        increaseCount: 0,
        decreaseCount: 0,
        unchangedCount: 0,
        averageChange: 0,
        maxIncrease: 0,
        maxDecrease: 0,
      };
    }

    let increaseCount = 0;
    let decreaseCount = 0;
    let unchangedCount = 0;
    let totalChange = 0;
    let maxIncrease = 0;
    let maxDecrease = 0;

    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i].price;
      const previous = history[i + 1].price;
      const change = current - previous;

      totalChange += Math.abs(change);

      if (change > 0) {
        increaseCount++;
        maxIncrease = Math.max(maxIncrease, change);
      } else if (change < 0) {
        decreaseCount++;
        maxDecrease = Math.min(maxDecrease, change);
      } else {
        unchangedCount++;
      }
    }

    const averageChange = totalChange / (history.length - 1);

    return {
      totalChanges: history.length,
      increaseCount,
      decreaseCount,
      unchangedCount,
      averageChange: Math.round(averageChange * 100) / 100,
      maxIncrease,
      maxDecrease: Math.abs(maxDecrease),
    };
  }, [history]);
}

/**
 * Hook to calculate time-based statistics
 */
export function useTimeBasedAnalytics(history: PriceHistory[]) {
  return useMemo(() => {
    if (history.length === 0) {
      return {
        oldestDate: null,
        newestDate: null,
        daysSpanned: 0,
        changesPerDay: 0,
        changesPerWeek: 0,
      };
    }

    const newest = new Date(history[0].created_at);
    const oldest = new Date(history[history.length - 1].created_at);

    const daysSpanned = Math.ceil(
      (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)
    );

    const changesPerDay = daysSpanned > 0 ? (history.length / daysSpanned) : 0;
    const changesPerWeek = changesPerDay * 7;

    return {
      oldestDate: oldest.toISOString().split('T')[0],
      newestDate: newest.toISOString().split('T')[0],
      daysSpanned,
      changesPerDay: Math.round(changesPerDay * 100) / 100,
      changesPerWeek: Math.round(changesPerWeek * 100) / 100,
    };
  }, [history]);
}
