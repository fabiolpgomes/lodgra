/**
 * Tests for confidence scoring (Story 36.9)
 */

import {
  calculateConfidenceScore,
  formatConfidencePercentage,
  getConfidenceColor,
  isDataSufficient,
  getDataWarning,
  estimateForecastAccuracy,
} from '@/lib/forecasting/confidenceScoring';

describe('Confidence Scoring', () => {
  describe('calculateConfidenceScore', () => {
    it('should return high confidence with sufficient data', () => {
      const score = calculateConfidenceScore(
        90, // dataPoints
        15, // variance
        100, // averageRevenue
        0, // trendStability
        10 // seasonalityStrength
      );

      expect(score.score).toBeGreaterThan(0.5);
      expect(score.level).toBe('high');
    });

    it('should return medium to low confidence with insufficient data', () => {
      const score = calculateConfidenceScore(
        5, // dataPoints
        80, // variance
        100, // averageRevenue
        0.5, // trendStability
        60 // seasonalityStrength
      );

      // With only 5 data points and high variance, should not be high confidence
      expect(score.level).not.toBe('high');
    });

    it('should calculate different confidence levels based on data quality', () => {
      const goodData = calculateConfidenceScore(
        50, // dataPoints
        10, // variance
        100, // averageRevenue
        0, // trendStability
        10 // seasonalityStrength
      );

      const poorData = calculateConfidenceScore(
        5, // dataPoints
        80, // variance
        100, // averageRevenue
        0.5, // trendStability
        50 // seasonalityStrength
      );

      // Good data should have higher confidence than poor data
      expect(goodData.score).toBeGreaterThan(poorData.score);
    });

    it('should provide reasoning', () => {
      const score = calculateConfidenceScore(50, 20, 100, 0, 10);

      expect(score.reasoning).toBeTruthy();
      expect(score.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('formatConfidencePercentage', () => {
    it('should format confidence score as percentage', () => {
      expect(formatConfidencePercentage(0.95)).toBe('95%');
      expect(formatConfidencePercentage(0.5)).toBe('50%');
      expect(formatConfidencePercentage(0.123)).toBe('12%');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return green for high confidence', () => {
      expect(getConfidenceColor('high')).toBe('#10b981');
    });

    it('should return amber for medium confidence', () => {
      expect(getConfidenceColor('medium')).toBe('#f59e0b');
    });

    it('should return red for low confidence', () => {
      expect(getConfidenceColor('low')).toBe('#ef4444');
    });
  });

  describe('isDataSufficient', () => {
    it('should return true with 10+ data points', () => {
      expect(isDataSufficient(10)).toBe(true);
      expect(isDataSufficient(50)).toBe(true);
    });

    it('should return false with < 10 data points', () => {
      expect(isDataSufficient(5)).toBe(false);
      expect(isDataSufficient(0)).toBe(false);
    });
  });

  describe('getDataWarning', () => {
    it('should return warning for no data', () => {
      const warning = getDataWarning(0);
      expect(warning).toBeTruthy();
      expect(warning).toContain('booking data');
    });

    it('should return warning for insufficient data', () => {
      const warning = getDataWarning(5);
      expect(warning).toBeTruthy();
    });

    it('should return null for sufficient data', () => {
      const warning = getDataWarning(10);
      expect(warning).toBeNull();
    });
  });

  describe('estimateForecastAccuracy', () => {
    it('should estimate higher accuracy for 30-day forecast', () => {
      const accuracy30 = estimateForecastAccuracy(0.9, 30);
      const accuracy90 = estimateForecastAccuracy(0.9, 90);

      expect(accuracy30).toBeGreaterThan(accuracy90);
    });

    it('should consider confidence score', () => {
      const accuracyHigh = estimateForecastAccuracy(0.9, 30);
      const accuracyLow = estimateForecastAccuracy(0.5, 30);

      expect(accuracyHigh).toBeGreaterThan(accuracyLow);
    });

    it('should return percentage between 0-100', () => {
      const accuracy = estimateForecastAccuracy(0.8, 60);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(100);
    });
  });
});
