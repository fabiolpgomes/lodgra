/**
 * Tests for market analysis (Story 36.10)
 */

import {
  analyzeMarketPosition,
  calculatePriceChangeMetrics,
  isSignificantPriceChange,
  getMarketRangeDescription,
  interpretMarketVolatility,
  getPositionColor,
  formatPrice,
} from '@/lib/competitor/marketAnalysis';

describe('Market Analysis', () => {
  describe('analyzeMarketPosition', () => {
    it('should analyze market position with competitive pricing', () => {
      const hostPrice = 100;
      const competitorPrices = [95, 100, 105, 110, 98];

      const analysis = analyzeMarketPosition(hostPrice, competitorPrices);

      expect(analysis.marketAveragePrice).toBeGreaterThan(95);
      expect(analysis.marketAveragePrice).toBeLessThan(110);
      expect(analysis.pricePosition).toBe('competitive');
      // After outlier removal (top/bottom 10%), we have 3 data points
      expect(analysis.competitorCount).toBe(3);
    });

    it('should identify high pricing', () => {
      const hostPrice = 200;
      const competitorPrices = [80, 85, 90, 95, 100];

      const analysis = analyzeMarketPosition(hostPrice, competitorPrices);

      expect(analysis.pricePosition).toBe('very_high');
      expect(analysis.percentageDifference).toBeGreaterThan(50);
    });

    it('should identify low pricing', () => {
      const hostPrice = 50;
      const competitorPrices = [150, 160, 170, 180, 190];

      const analysis = analyzeMarketPosition(hostPrice, competitorPrices);

      expect(analysis.pricePosition).toBe('very_low');
      expect(analysis.percentageDifference).toBeLessThan(-50);
    });

    it('should handle empty competitor prices', () => {
      const hostPrice = 100;
      const analysis = analyzeMarketPosition(hostPrice, []);

      expect(analysis.competitorCount).toBe(0);
      expect(analysis.pricePosition).toBe('competitive');
    });

    it('should calculate confidence score based on sample size', () => {
      const hostPrice = 100;

      const smallSample = analyzeMarketPosition(hostPrice, [95, 105]);
      const largeSample = analyzeMarketPosition(hostPrice, [90, 95, 100, 105, 110, 115, 120, 125, 130, 135]);

      expect(largeSample.confidenceScore).toBeGreaterThan(smallSample.confidenceScore);
    });

    it('should provide recommendation', () => {
      const hostPrice = 100;
      const competitorPrices = [80, 85, 90, 95, 100];

      const analysis = analyzeMarketPosition(hostPrice, competitorPrices);

      expect(analysis.recommendation).toBeTruthy();
      expect(analysis.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePriceChangeMetrics', () => {
    it('should calculate price increase', () => {
      const metrics = calculatePriceChangeMetrics(120, 100);

      expect(metrics.change).toBe(20);
      expect(metrics.percentageChange).toBe(20);
      expect(metrics.direction).toBe('up');
    });

    it('should calculate price decrease', () => {
      const metrics = calculatePriceChangeMetrics(80, 100);

      expect(metrics.change).toBe(-20);
      expect(metrics.percentageChange).toBe(-20);
      expect(metrics.direction).toBe('down');
    });

    it('should identify stable prices', () => {
      const metrics = calculatePriceChangeMetrics(100.5, 100);

      expect(metrics.direction).toBe('stable');
    });
  });

  describe('isSignificantPriceChange', () => {
    it('should identify significant change (> 10%)', () => {
      expect(isSignificantPriceChange(15)).toBe(true);
      expect(isSignificantPriceChange(-12)).toBe(true);
    });

    it('should identify insignificant change (<= 10%)', () => {
      expect(isSignificantPriceChange(8)).toBe(false);
      expect(isSignificantPriceChange(-5)).toBe(false);
    });

    it('should use custom threshold', () => {
      expect(isSignificantPriceChange(8, 5)).toBe(true);
      expect(isSignificantPriceChange(3, 5)).toBe(false);
    });
  });

  describe('getMarketRangeDescription', () => {
    it('should format market range', () => {
      const description = getMarketRangeDescription(80, 150);

      expect(description).toContain('80');
      expect(description).toContain('150');
      expect(description).toContain('€');
    });

    it('should use custom currency', () => {
      const description = getMarketRangeDescription(80, 150, '$');

      expect(description).toContain('$');
    });
  });

  describe('interpretMarketVolatility', () => {
    it('should interpret low volatility', () => {
      const interpretation = interpretMarketVolatility(5);
      expect(interpretation).toContain('Very stable');
    });

    it('should interpret moderate volatility', () => {
      const interpretation = interpretMarketVolatility(25);
      expect(interpretation).toContain('Moderate');
    });

    it('should interpret high volatility', () => {
      const interpretation = interpretMarketVolatility(50);
      expect(interpretation).toContain('High');
    });
  });

  describe('getPositionColor', () => {
    it('should return green for very_low', () => {
      expect(getPositionColor('very_low')).toBe('#10b981');
    });

    it('should return blue for low', () => {
      expect(getPositionColor('low')).toBe('#3b82f6');
    });

    it('should return gray for competitive', () => {
      expect(getPositionColor('competitive')).toBe('#6b7280');
    });

    it('should return amber for high', () => {
      expect(getPositionColor('high')).toBe('#f59e0b');
    });

    it('should return red for very_high', () => {
      expect(getPositionColor('very_high')).toBe('#ef4444');
    });
  });

  describe('formatPrice', () => {
    it('should format price with currency', () => {
      expect(formatPrice(100)).toBe('€100.00');
      expect(formatPrice(1234.56)).toBe('€1,234.56');
    });

    it('should use custom currency', () => {
      expect(formatPrice(100, '$')).toBe('$100.00');
    });
  });
});
