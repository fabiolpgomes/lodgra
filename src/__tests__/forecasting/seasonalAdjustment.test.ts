/**
 * Tests for seasonal adjustment (Story 36.9)
 */

import {
  calculateSeasonalFactor,
  applySeasonalAdjustment,
  getHolidayImpact,
  isPeakSeason,
  adjustForecastWithSeasoning,
  getSeasonalSummary,
} from '@/lib/forecasting/seasonalAdjustment';

describe('Seasonal Adjustment', () => {
  describe('calculateSeasonalFactor', () => {
    it('should calculate seasonal factors', () => {
      const bookingRevenues = new Map<number, number[]>([
        [0, [80, 85]], // January: low season
        [5, [150, 160]], // June: high season
        [6, [180, 190]], // July: peak season
      ]);

      const factors = calculateSeasonalFactor(bookingRevenues);

      expect(factors.size).toBeGreaterThan(0);
      expect(factors.get(5)?.factor).toBeGreaterThan(factors.get(0)?.factor);
    });

    it('should return default pattern for empty data', () => {
      const factors = calculateSeasonalFactor(new Map());

      expect(factors.size).toBe(12);
      expect(factors.get(5)?.factor).toBeGreaterThan(1); // June should be high
      expect(factors.get(0)?.factor).toBeLessThan(1); // January should be low
    });
  });

  describe('applySeasonalAdjustment', () => {
    it('should adjust revenue based on seasonal factor', () => {
      const baseRevenue = 100;
      const seasonalFactors = new Map([
        [6, { month: 6, factor: 1.5, reasoning: 'Peak summer' }],
      ]);

      const adjusted = applySeasonalAdjustment(baseRevenue, 6, seasonalFactors);

      expect(adjusted).toBe(150);
    });

    it('should return base revenue if no factor found', () => {
      const baseRevenue = 100;
      const seasonalFactors = new Map<number, any>();

      const adjusted = applySeasonalAdjustment(baseRevenue, 6, seasonalFactors);

      expect(adjusted).toBe(baseRevenue);
    });
  });

  describe('getHolidayImpact', () => {
    it('should detect Christmas', () => {
      const christmasDate = new Date('2026-12-25');
      const impact = getHolidayImpact(christmasDate);

      expect(impact).toBeGreaterThan(1.0);
    });

    it('should detect New Year', () => {
      const newYearDate = new Date('2026-01-01');
      const impact = getHolidayImpact(newYearDate);

      expect(impact).toBeGreaterThan(1.0);
    });

    it('should return 1.0 for regular days', () => {
      const regularDate = new Date('2026-03-15');
      const impact = getHolidayImpact(regularDate);

      expect(impact).toBe(1.0);
    });
  });

  describe('isPeakSeason', () => {
    it('should identify summer as peak season', () => {
      const juneDate = new Date('2026-06-15');
      expect(isPeakSeason(juneDate)).toBe(true);

      const julyDate = new Date('2026-07-15');
      expect(isPeakSeason(julyDate)).toBe(true);
    });

    it('should identify December as peak season', () => {
      const decemberDate = new Date('2026-12-15');
      expect(isPeakSeason(decemberDate)).toBe(true);
    });

    it('should identify winter as low season', () => {
      const februaryDate = new Date('2026-02-15');
      expect(isPeakSeason(februaryDate)).toBe(false);
    });
  });

  describe('adjustForecastWithSeasoning', () => {
    it('should apply seasonal and holiday adjustments', () => {
      const baseRevenue = 100;
      const christmasDate = new Date('2026-12-25');
      const seasonalFactors = new Map([
        [11, { month: 11, factor: 0.9, reasoning: 'December' }],
      ]);

      const adjusted = adjustForecastWithSeasoning(
        baseRevenue,
        christmasDate,
        seasonalFactors
      );

      expect(adjusted).toBeGreaterThan(baseRevenue * 0.9);
    });
  });

  describe('getSeasonalSummary', () => {
    it('should generate seasonal summary', () => {
      const seasonalFactors = new Map([
        [5, { month: 5, factor: 1.5, reasoning: 'Peak season' }],
        [6, { month: 6, factor: 1.6, reasoning: 'Peak season' }],
        [0, { month: 0, factor: 0.7, reasoning: 'Low season' }],
        [1, { month: 1, factor: 0.65, reasoning: 'Low season' }],
      ]);

      const summary = getSeasonalSummary(seasonalFactors);

      expect(summary).toContain('Peak');
      expect(summary).toContain('Low');
    });
  });
});
