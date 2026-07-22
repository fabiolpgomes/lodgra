/**
 * Tests for RecommendationEngine
 * Story 36.8: Tests for price history analysis, pattern detection, and recommendation generation
 */

import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '@/lib/pricing/recommendation-engine';
import type { PriceHistory, MarketAnalysis } from '@/types/pricing.types';

// Helper to create mock price history
function createPriceHistory(
  baseDate: Date,
  days: number,
  basPrice: number,
  variance: number = 0.1
): PriceHistory[] {
  const history: PriceHistory[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);
    const variation = basPrice * (1 + (Math.random() - 0.5) * variance * 2);
    history.push({
      id: `price-${i}`,
      property_id: 'test-property',
      price: Math.round(variation * 100) / 100,
      date_applied: date.toISOString().split('T')[0],
      changed_by: 'test-user',
      change_reason: 'daily pricing',
      is_revert: false,
      previous_price_record_id: undefined,
      is_deleted: false,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    });
  }
  return history;
}

// Mock market analysis
const mockMarketAnalysis: MarketAnalysis = {
  median_price: 100,
  market_trend: 'stable',
  competitor_avg: 105,
  sample_size: 500,
};

describe('RecommendationEngine', () => {
  describe('generateRecommendation', () => {
    it('should generate recommendation with full price history', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100, 0.2);
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.recommendedPrice).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reason).toBeTruthy();
      expect(result.marketAnalysis).toBeDefined();
      expect(result.revenueProjection).toBeDefined();
    });

    it('should return low confidence with insufficient data (< 30 days)', () => {
      const priceHistory = createPriceHistory(new Date(), 20, 100);
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reason).toContain('Insufficient price history');
    });

    it('should calculate confidence score between 0 and 1', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100, 0.15);
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect seasonal patterns', () => {
      const baseDate = new Date();
      const priceHistory: PriceHistory[] = [];

      // Create 12 months of data with seasonal variation
      for (let month = 0; month < 12; month++) {
        for (let day = 0; day < 28; day++) {
          const date = new Date(baseDate);
          date.setMonth(month);
          date.setDate(day + 1);

          // Higher prices in summer months (6-8)
          const seasonalVariation = month >= 5 && month <= 7 ? 1.3 : 0.9;
          const price = 100 * seasonalVariation;

          priceHistory.push({
            id: `price-${month}-${day}`,
            property_id: 'test-property',
            price: Math.round(price * 100) / 100,
            date_applied: date.toISOString().split('T')[0],
            changed_by: 'test-user',
            change_reason: 'seasonal pricing',
            is_revert: false,
            previous_price_record_id: undefined,
            is_deleted: false,
            created_at: date.toISOString(),
            updated_at: date.toISOString(),
          });
        }
      }

      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.patterns.seasonal.length).toBeGreaterThan(0);
      expect(result.reason).toBeTruthy();
    });

    it('should handle market trend adjustments', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100);

      const upwardMarket: MarketAnalysis = {
        median_price: 100,
        market_trend: 'up',
        competitor_avg: 105,
        sample_size: 500,
      };

      const resultUp = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        upwardMarket
      );

      const downwardMarket: MarketAnalysis = {
        median_price: 100,
        market_trend: 'down',
        competitor_avg: 95,
        sample_size: 500,
      };

      const resultDown = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        downwardMarket
      );

      expect(resultUp.recommendedPrice).not.toEqual(resultDown.recommendedPrice);
    });

    it('should project revenue impact accurately (±5% tolerance)', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100);
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis,
        { currentMonthlyBookings: 15, avgMonthlyBookings: 15 }
      );

      const expectedProjection = 100 * 15; // current: €1500/month
      const actualProjection = result.revenueProjection.current_monthly;

      expect(actualProjection).toBeCloseTo(expectedProjection, 0);
    });

    it('should handle deleted price records correctly', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100);
      // Mark some as deleted
      priceHistory.slice(0, 50).forEach((ph) => {
        ph.is_deleted = true;
      });

      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.recommendedPrice).toBeGreaterThan(0);
      // Should still work with valid records
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConfidenceBadge', () => {
    it('should return high confidence badge for score >= 0.75', () => {
      const badge = RecommendationEngine.getConfidenceBadge(0.85);
      expect(badge.level).toBe('high');
      expect(badge.label).toBe('High Confidence');
    });

    it('should return medium confidence badge for score 0.5-0.75', () => {
      const badge = RecommendationEngine.getConfidenceBadge(0.65);
      expect(badge.level).toBe('medium');
      expect(badge.label).toBe('Medium Confidence');
    });

    it('should return low confidence badge for score < 0.5', () => {
      const badge = RecommendationEngine.getConfidenceBadge(0.35);
      expect(badge.level).toBe('low');
      expect(badge.label).toBe('Low Confidence');
    });

    it('should preserve the confidence score in badge', () => {
      const score = 0.72;
      const badge = RecommendationEngine.getConfidenceBadge(score);
      expect(badge.score).toBe(score);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high variance in prices (low confidence)', () => {
      const priceHistory = createPriceHistory(new Date(), 180, 100, 0.8); // High variance
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should handle single occupancy event gracefully', () => {
      const priceHistory: PriceHistory[] = [
        {
          id: 'price-1',
          property_id: 'test-property',
          price: 100,
          date_applied: '2026-07-20',
          changed_by: 'test-user',
          change_reason: 'single event',
          is_revert: false,
          previous_price_record_id: undefined,
          is_deleted: false,
          created_at: '2026-07-20T00:00:00Z',
          updated_at: '2026-07-20T00:00:00Z',
        },
      ];

      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle empty price history', () => {
      const result = RecommendationEngine.generateRecommendation(
        [],
        100,
        mockMarketAnalysis
      );

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.reason).toContain('Insufficient price history');
    });

    it('should not recommend price of zero or negative', () => {
      const priceHistory = createPriceHistory(new Date(), 365, 100);
      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.recommendedPrice).toBeGreaterThan(0);
    });
  });

  describe('Trend Analysis', () => {
    it('should detect upward price trend', () => {
      const baseDate = new Date();
      const priceHistory: PriceHistory[] = [];

      // Create 365 days of gradually increasing prices
      for (let i = 0; i < 365; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        const price = 100 + (i / 365) * 30; // Increase from €100 to €130

        priceHistory.push({
          id: `price-${i}`,
          property_id: 'test-property',
          price: Math.round(price * 100) / 100,
          date_applied: date.toISOString().split('T')[0],
          changed_by: 'test-user',
          change_reason: 'daily pricing',
          is_revert: false,
          previous_price_record_id: undefined,
          is_deleted: false,
          created_at: date.toISOString(),
          updated_at: date.toISOString(),
        });
      }

      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.patterns.trend).toBe('increasing');
      expect(result.reason).toContain('upward');
    });

    it('should detect downward price trend', () => {
      const baseDate = new Date();
      const priceHistory: PriceHistory[] = [];

      // Create 365 days of gradually decreasing prices
      for (let i = 0; i < 365; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - i);
        const price = 130 - (i / 365) * 30; // Decrease from €130 to €100

        priceHistory.push({
          id: `price-${i}`,
          property_id: 'test-property',
          price: Math.round(price * 100) / 100,
          date_applied: date.toISOString().split('T')[0],
          changed_by: 'test-user',
          change_reason: 'daily pricing',
          is_revert: false,
          previous_price_record_id: undefined,
          is_deleted: false,
          created_at: date.toISOString(),
          updated_at: date.toISOString(),
        });
      }

      const result = RecommendationEngine.generateRecommendation(
        priceHistory,
        100,
        mockMarketAnalysis
      );

      expect(result.patterns.trend).toBe('decreasing');
      expect(result.reason).toContain('cooling');
    });
  });
});
