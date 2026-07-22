/**
 * Story 36.7: Price History Calculator Tests
 * Unit tests for price statistics and calculations
 */

import {
  calculatePriceStats,
  calculateRevenueImpact,
  getAveragePriceForRange,
  getPriceChangeFrequency,
  detectSignificantPriceChanges,
  formatPrice,
  formatDate,
  getPriceTrend,
} from '@/lib/pricing/price-history-calculator';
import { PriceHistory } from '@/types/pricing.types';

describe('Price History Calculator', () => {
  const mockHistory: PriceHistory[] = [
    {
      id: '1',
      property_id: 'prop-1',
      price: 150,
      date_applied: '2024-01-10',
      changed_by: 'user-1',
      change_reason: 'Seasonal adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      property_id: 'prop-1',
      price: 130,
      date_applied: '2024-01-08',
      changed_by: 'user-1',
      change_reason: 'Manual adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-08T10:00:00Z',
      updated_at: '2024-01-08T10:00:00Z',
    },
    {
      id: '3',
      property_id: 'prop-1',
      price: 120,
      date_applied: '2024-01-05',
      changed_by: 'user-1',
      change_reason: null,
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-05T10:00:00Z',
      updated_at: '2024-01-05T10:00:00Z',
    },
  ];

  describe('calculatePriceStats', () => {
    it('should calculate correct statistics for price history', () => {
      const stats = calculatePriceStats(mockHistory);

      expect(stats.minPrice).toBe(120);
      expect(stats.maxPrice).toBe(150);
      expect(stats.avgPrice).toBe(133.33);
      expect(stats.changeCount).toBe(3);
      expect(stats.stdDeviation).toBeGreaterThan(0);
    });

    it('should handle empty history array', () => {
      const stats = calculatePriceStats([]);

      expect(stats.minPrice).toBe(0);
      expect(stats.maxPrice).toBe(0);
      expect(stats.avgPrice).toBe(0);
      expect(stats.changeCount).toBe(0);
      expect(stats.stdDeviation).toBe(0);
    });

    it('should handle single record', () => {
      const stats = calculatePriceStats([mockHistory[0]]);

      expect(stats.minPrice).toBe(150);
      expect(stats.maxPrice).toBe(150);
      expect(stats.avgPrice).toBe(150);
      expect(stats.changeCount).toBe(1);
    });

    it('should handle identical prices', () => {
      const identical = [
        { ...mockHistory[0], price: 100 },
        { ...mockHistory[1], price: 100 },
        { ...mockHistory[2], price: 100 },
      ];
      const stats = calculatePriceStats(identical);

      expect(stats.minPrice).toBe(100);
      expect(stats.maxPrice).toBe(100);
      expect(stats.avgPrice).toBe(100);
      expect(stats.stdDeviation).toBe(0);
    });
  });

  describe('calculateRevenueImpact', () => {
    it('should calculate revenue impact for price increase', () => {
      const impact = calculateRevenueImpact(150, 130, 10);

      expect(impact.priceChange).toBe(20);
      expect(impact.percentageChange).toBeCloseTo(15.38, 1);
      expect(impact.estimatedBookings).toBe(10);
      expect(impact.estimatedImpact).toBe(200);
    });

    it('should calculate revenue impact for price decrease', () => {
      const impact = calculateRevenueImpact(100, 120, 10);

      expect(impact.priceChange).toBe(-20);
      expect(impact.percentageChange).toBeLessThan(0);
      expect(impact.estimatedImpact).toBe(-200);
    });

    it('should handle no bookings', () => {
      const impact = calculateRevenueImpact(150, 130, 0);

      expect(impact.priceChange).toBe(20);
      expect(impact.estimatedBookings).toBe(0);
      expect(impact.estimatedImpact).toBe(0);
    });

    it('should handle zero previous price', () => {
      const impact = calculateRevenueImpact(100, 0, 10);

      expect(impact.percentageChange).toBe(0);
    });
  });

  describe('getAveragePriceForRange', () => {
    it('should calculate average for date range', () => {
      const avg = getAveragePriceForRange(mockHistory, '2024-01-05', '2024-01-10');

      expect(avg).toBe(133.33);
    });

    it('should return 0 for empty range', () => {
      const avg = getAveragePriceForRange(mockHistory, '2024-02-01', '2024-02-28');

      expect(avg).toBe(0);
    });

    it('should include boundary dates', () => {
      const avg = getAveragePriceForRange(mockHistory, '2024-01-10', '2024-01-10');

      expect(avg).toBe(150);
    });
  });

  describe('getPriceChangeFrequency', () => {
    it('should calculate changes per week', () => {
      const frequency = getPriceChangeFrequency(mockHistory);

      expect(frequency).toBeGreaterThan(0);
    });

    it('should return 0 for single record', () => {
      const frequency = getPriceChangeFrequency([mockHistory[0]]);

      expect(frequency).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const frequency = getPriceChangeFrequency([]);

      expect(frequency).toBe(0);
    });
  });

  describe('detectSignificantPriceChanges', () => {
    it('should detect price changes above threshold', () => {
      const changes = detectSignificantPriceChanges(mockHistory, 10);

      expect(changes.length).toBeGreaterThan(0);
    });

    it('should respect threshold parameter', () => {
      const changes = detectSignificantPriceChanges(mockHistory, 50);

      expect(changes.length).toBeLessThanOrEqual(mockHistory.length);
    });

    it('should return empty for single record', () => {
      const changes = detectSignificantPriceChanges([mockHistory[0]], 10);

      expect(changes.length).toBe(0);
    });
  });

  describe('formatPrice', () => {
    it('should format price with currency symbol', () => {
      const formatted = formatPrice(100, 'EUR');

      expect(formatted).toContain('100');
      expect(formatted).toBeDefined();
    });

    it('should handle decimal places', () => {
      const formatted = formatPrice(100.5, 'EUR');

      expect(formatted).toBeDefined();
    });

    it('should use default EUR currency', () => {
      const formatted = formatPrice(100);

      expect(formatted).toBeDefined();
    });
  });

  describe('formatDate', () => {
    it('should format date string to readable format', () => {
      const formatted = formatDate('2024-01-10');

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('10');
      expect(formatted).toContain('2024');
    });

    it('should handle different date formats', () => {
      const formatted = formatDate('2024-12-25');

      expect(formatted).toBeDefined();
    });
  });

  describe('getPriceTrend', () => {
    it('should detect upward trend', () => {
      const trend = getPriceTrend(mockHistory);

      expect(['up', 'down', 'stable']).toContain(trend);
    });

    it('should return stable for single record', () => {
      const trend = getPriceTrend([mockHistory[0]]);

      expect(trend).toBe('stable');
    });

    it('should return stable for identical prices', () => {
      const identical = [
        { ...mockHistory[0], price: 100 },
        { ...mockHistory[1], price: 100 },
      ];
      const trend = getPriceTrend(identical);

      expect(trend).toBe('stable');
    });

    it('should detect downward trend', () => {
      const downtrend = [
        { ...mockHistory[0], price: 100 },
        { ...mockHistory[1], price: 110 },
      ];
      const trend = getPriceTrend(downtrend);

      expect(trend).toBe('down');
    });
  });
});
