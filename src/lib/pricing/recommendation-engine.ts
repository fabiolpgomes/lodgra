/**
 * RecommendationEngine - AI-driven price recommendation algorithm
 * Story 36.8: Analyzes price history, detects patterns, benchmarks against market,
 * and generates personalized price suggestions with confidence levels and reasoning
 */

import type {
  PriceHistory,
  MarketAnalysis,
  RevenueProjection,
  ConfidenceBadge,
} from '@/types/pricing.types';

/**
 * Seasonal pattern data (month-over-month comparison)
 */
interface SeasonalPattern {
  month: number;
  avgPrice: number;
  avgOccupancy: number;
  trend: number; // percentage change from previous month
}

/**
 * Weekly pattern data (day-of-week analysis)
 */
interface WeeklyPattern {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  avgPrice: number;
  frequency: number;
}

/**
 * Recommendation generation result
 */
export interface RecommendationResult {
  recommendedPrice: number;
  confidence: number;
  reason: string;
  marketAnalysis: MarketAnalysis;
  revenueProjection: RevenueProjection;
  patterns: {
    seasonal: SeasonalPattern[];
    weekly: WeeklyPattern[];
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * RecommendationEngine - Static utility class for price recommendations
 */
export class RecommendationEngine {
  /**
   * Generate recommendation based on price history and market data
   */
  static generateRecommendation(
    priceHistory: PriceHistory[],
    currentPrice: number,
    marketBenchmark: MarketAnalysis,
    occupancyData?: { currentMonthlyBookings: number; avgMonthlyBookings: number }
  ): RecommendationResult {
    // Filter out soft-deleted records and validate data
    const validHistory = priceHistory.filter((ph) => !ph.is_deleted && ph.price > 0);

    if (validHistory.length < 30) {
      return this.getInsufficientDataRecommendation(currentPrice, marketBenchmark);
    }

    // 1. Detect seasonal patterns (last 12 months)
    const seasonalPatterns = this.detectSeasonalPatterns(validHistory);

    // 2. Detect weekly patterns
    const weeklyPatterns = this.detectWeeklyPatterns(validHistory);

    // 3. Calculate trend (as percentage)
    const trendPercent = this.calculateTrend(validHistory);

    // Convert numeric trend to trend category
    const trendCategory: 'increasing' | 'decreasing' | 'stable' =
      trendPercent > 10 ? 'increasing' : trendPercent < -10 ? 'decreasing' : 'stable';

    // 4. Calculate confidence score
    const dataQualityScore = this.calculateDataQuality(validHistory);
    const patternStrengthScore = this.calculatePatternStrength(seasonalPatterns);
    const confidence = (dataQualityScore + patternStrengthScore) / 2;

    // 5. Calculate base recommendation
    const stats = this.calculatePriceStatistics(validHistory);
    const optimalPrice = stats.avgPrice * (1 + trendPercent / 100);
    const baseRecommendation = (optimalPrice + marketBenchmark.median_price) / 2;

    // 6. Apply market benchmark adjustment
    const adjustment = this.calculateMarketAdjustment(
      baseRecommendation,
      marketBenchmark,
      confidence
    );
    const recommendedPrice = Math.round(baseRecommendation * (1 + adjustment) * 100) / 100;

    // 7. Project revenue impact
    const revenueProjection = this.projectRevenueImpact(
      currentPrice,
      recommendedPrice,
      occupancyData
    );

    // 8. Generate reasoning
    const reason = this.generateReasoning(
      seasonalPatterns,
      marketBenchmark,
      recommendedPrice,
      trendPercent
    );

    return {
      recommendedPrice,
      confidence: Math.min(Math.max(confidence, 0), 1),
      reason,
      marketAnalysis: marketBenchmark,
      revenueProjection,
      patterns: {
        seasonal: seasonalPatterns,
        weekly: weeklyPatterns,
        trend: trendCategory,
      },
    };
  }

  /**
   * Detect seasonal patterns from price history (month-over-month)
   */
  private static detectSeasonalPatterns(history: PriceHistory[]): SeasonalPattern[] {
    const monthMap = new Map<number, { prices: number[]; occupancy: number[] }>();

    history.forEach((record) => {
      const date = new Date(record.date_applied);
      const month = date.getMonth();

      if (!monthMap.has(month)) {
        monthMap.set(month, { prices: [], occupancy: [] });
      }

      const data = monthMap.get(month)!;
      data.prices.push(record.price);
      // Simple occupancy proxy: if there's a record for this day, assume occupied
      data.occupancy.push(1);
    });

    const patterns: SeasonalPattern[] = [];
    let prevMonthAvg = 0;

    for (let month = 0; month < 12; month++) {
      const data = monthMap.get(month);
      if (!data || data.prices.length === 0) continue;

      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      const avgOccupancy =
        data.occupancy.reduce((a, b) => a + b, 0) / data.occupancy.length;
      const trend = prevMonthAvg > 0 ? ((avgPrice - prevMonthAvg) / prevMonthAvg) * 100 : 0;

      patterns.push({
        month,
        avgPrice: Math.round(avgPrice * 100) / 100,
        avgOccupancy,
        trend: Math.round(trend * 100) / 100,
      });

      prevMonthAvg = avgPrice;
    }

    return patterns;
  }

  /**
   * Detect weekly patterns from price history (day-of-week analysis)
   */
  private static detectWeeklyPatterns(history: PriceHistory[]): WeeklyPattern[] {
    const dayMap = new Map<number, { prices: number[]; count: number }>();

    history.forEach((record) => {
      const date = new Date(record.date_applied);
      const dayOfWeek = date.getDay();

      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, { prices: [], count: 0 });
      }

      const data = dayMap.get(dayOfWeek)!;
      data.prices.push(record.price);
      data.count++;
    });

    const patterns: WeeklyPattern[] = [];

    for (let day = 0; day < 7; day++) {
      const data = dayMap.get(day);
      if (!data || data.prices.length === 0) continue;

      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;

      patterns.push({
        dayOfWeek: day,
        avgPrice: Math.round(avgPrice * 100) / 100,
        frequency: data.count,
      });
    }

    return patterns;
  }

  /**
   * Calculate price trend (increasing/decreasing/stable)
   */
  private static calculateTrend(history: PriceHistory[]): number {
    if (history.length < 2) return 0;

    const sorted = [...history].sort(
      (a, b) => new Date(a.date_applied).getTime() - new Date(b.date_applied).getTime()
    );

    const firstQuarter = sorted.slice(0, Math.ceil(sorted.length / 4));
    const lastQuarter = sorted.slice(-Math.ceil(sorted.length / 4));

    const firstAvg =
      firstQuarter.reduce((sum, h) => sum + h.price, 0) / firstQuarter.length;
    const lastAvg =
      lastQuarter.reduce((sum, h) => sum + h.price, 0) / lastQuarter.length;

    return ((lastAvg - firstAvg) / firstAvg) * 100;
  }

  /**
   * Calculate data quality score (0-1)
   * Based on sample size, variance, and time span
   */
  private static calculateDataQuality(history: PriceHistory[]): number {
    // Factor 1: Sample size (max 1 point at 365+ records)
    const sampleSize = Math.min(history.length / 365, 1);

    // Factor 2: Variance (low variance = high quality, max 1 point)
    const stats = this.calculatePriceStatistics(history);
    const coefficientOfVariation = stats.stdDeviation / stats.avgPrice;
    const variance = Math.max(1 - coefficientOfVariation, 0);

    // Factor 3: Time span (max 1 point at 12 months)
    const minDate = new Date(
      Math.min(...history.map((h) => new Date(h.date_applied).getTime()))
    );
    const maxDate = new Date(
      Math.max(...history.map((h) => new Date(h.date_applied).getTime()))
    );
    const daySpan = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const timeSpan = Math.min(daySpan / 365, 1);

    return (sampleSize + variance + timeSpan) / 3;
  }

  /**
   * Calculate pattern strength score (0-1)
   * Based on consistency of seasonal patterns
   */
  private static calculatePatternStrength(patterns: SeasonalPattern[]): number {
    if (patterns.length === 0) return 0;

    // Higher consistency = lower variance = stronger pattern
    const avgPrices = patterns.map((p) => p.avgPrice);
    const mean = avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length;
    const variance =
      avgPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / avgPrices.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;

    return Math.max(1 - coefficientOfVariation, 0);
  }

  /**
   * Calculate market adjustment factor based on market benchmark
   */
  private static calculateMarketAdjustment(
    basePrice: number,
    benchmark: MarketAnalysis,
    confidence: number
  ): number {
    const priceRatio = basePrice / benchmark.median_price;
    const trendFactor = benchmark.market_trend === 'up' ? 0.05 : benchmark.market_trend === 'down' ? -0.05 : 0;

    // Adjust based on how far we are from market median
    let adjustment = 0;
    if (priceRatio < 0.9) {
      adjustment = 0.05; // Below market, recommend slight increase
    } else if (priceRatio > 1.1) {
      adjustment = -0.03; // Above market, recommend slight decrease
    }

    // Apply confidence weighting
    return (adjustment + trendFactor) * confidence;
  }

  /**
   * Project revenue impact of applying the recommended price
   */
  private static projectRevenueImpact(
    currentPrice: number,
    recommendedPrice: number,
    occupancyData?: { currentMonthlyBookings: number; avgMonthlyBookings: number }
  ): RevenueProjection {
    // Default occupancy estimate: 50% monthly occupancy (15 days per month)
    const currentMonthlyBookings = occupancyData?.currentMonthlyBookings ?? 15;
    const avgMonthlyBookings = occupancyData?.avgMonthlyBookings ?? 15;

    // Calculate elasticity (simplified: 1% price increase leads to 0.5% booking decrease)
    const priceChangePercent = (recommendedPrice - currentPrice) / currentPrice;
    const bookingChangePercent = priceChangePercent * -0.5;
    const projectedMonthlyBookings = Math.round(
      currentMonthlyBookings * (1 + bookingChangePercent)
    );

    const currentMonthlyRevenue = currentPrice * currentMonthlyBookings;
    const projectedMonthlyRevenue = recommendedPrice * projectedMonthlyBookings;
    const difference = Math.round((projectedMonthlyRevenue - currentMonthlyRevenue) * 100) / 100;
    const percentageChange =
      Math.round(((projectedMonthlyRevenue - currentMonthlyRevenue) / currentMonthlyRevenue) * 10000) / 100;

    return {
      current_monthly: Math.round(currentMonthlyRevenue * 100) / 100,
      projected_monthly: Math.round(projectedMonthlyRevenue * 100) / 100,
      difference,
      percentage_change: percentageChange,
    };
  }

  /**
   * Calculate basic price statistics
   */
  private static calculatePriceStatistics(
    history: PriceHistory[]
  ): {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    stdDeviation: number;
  } {
    if (history.length === 0) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, stdDeviation: 0 };
    }

    const prices = history.map((h) => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / prices.length;
    const stdDeviation = Math.sqrt(variance);

    return {
      minPrice,
      maxPrice,
      avgPrice: Math.round(avgPrice * 100) / 100,
      stdDeviation: Math.round(stdDeviation * 100) / 100,
    };
  }

  /**
   * Generate human-readable reasoning for the recommendation
   */
  private static generateReasoning(
    seasonalPatterns: SeasonalPattern[],
    marketBenchmark: MarketAnalysis,
    recommendedPrice: number,
    trend: number
  ): string {
    const reasons: string[] = [];

    // Seasonal reason
    if (seasonalPatterns.length > 0) {
      const maxMonth = seasonalPatterns.reduce((prev, current) =>
        current.avgPrice > prev.avgPrice ? current : prev
      );
      const monthName = new Date(0, maxMonth.month).toLocaleString('default', {
        month: 'long',
      });
      reasons.push(
        `Peak demand in ${monthName} (${Math.round(maxMonth.trend)}% above average)`
      );
    }

    // Market benchmark reason
    const marketDiff =
      (Math.round(
        ((recommendedPrice - marketBenchmark.median_price) / marketBenchmark.median_price) *
          100
      ) * 100) / 100;
    if (marketDiff > 5) {
      reasons.push(`Above market median (${marketBenchmark.median_price}€) by ${marketDiff}%`);
    } else if (marketDiff < -5) {
      reasons.push(
        `Below market median (${marketBenchmark.median_price}€) by ${Math.abs(marketDiff)}%`
      );
    } else {
      reasons.push(`Aligned with market median (${marketBenchmark.median_price}€)`);
    }

    // Trend reason
    if (trend > 10) {
      reasons.push('Strong upward price trend observed');
    } else if (trend < -10) {
      reasons.push('Price pressure from market cooling');
    }

    // Market trend reason
    reasons.push(`Market trend is ${marketBenchmark.market_trend}`);

    return reasons.join('. ') + '.';
  }

  /**
   * Handle insufficient data scenario
   */
  private static getInsufficientDataRecommendation(
    currentPrice: number,
    marketBenchmark: MarketAnalysis
  ): RecommendationResult {
    const recommendedPrice = (currentPrice + marketBenchmark.median_price) / 2;

    return {
      recommendedPrice,
      confidence: 0.3, // Low confidence due to insufficient data
      reason:
        'Insufficient price history (less than 30 days). Recommendation based primarily on market median. Collect more data for better recommendations.',
      marketAnalysis: marketBenchmark,
      revenueProjection: {
        current_monthly: currentPrice * 15,
        projected_monthly: recommendedPrice * 15,
        difference: Math.round((recommendedPrice * 15 - currentPrice * 15) * 100) / 100,
        percentage_change: Math.round(
          (((recommendedPrice * 15 - currentPrice * 15) / (currentPrice * 15)) * 100) * 100
        ) / 100,
      },
      patterns: {
        seasonal: [],
        weekly: [],
        trend: 'stable',
      },
    };
  }

  /**
   * Calculate confidence badge level and label
   */
  static getConfidenceBadge(confidence: number): ConfidenceBadge {
    if (confidence >= 0.75) {
      return { level: 'high', score: confidence, label: 'High Confidence' };
    } else if (confidence >= 0.5) {
      return { level: 'medium', score: confidence, label: 'Medium Confidence' };
    } else {
      return { level: 'low', score: confidence, label: 'Low Confidence' };
    }
  }
}
