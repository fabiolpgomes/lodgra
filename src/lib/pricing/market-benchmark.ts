/**
 * Market Benchmark Service - Regional pricing benchmarks
 * Story 36.8: Provides market data for benchmarking against regional/property-type rates
 */

import type { MarketAnalysis } from '@/types/pricing.types';

/**
 * Market benchmark data structure
 */
export interface BenchmarkData {
  regionId: string;
  propertyType: string;
  medianPrice: number;
  trend: 'up' | 'down' | 'stable';
  sampleSize: number;
  lastUpdated: string;
}

/**
 * Property features for adjustment calculation
 */
export interface PropertyFeatures {
  beds: number;
  baths: number;
  amenities: string[];
  propertyType: string;
  region?: string;
}

/**
 * Market Benchmark Service - Static utility class
 */
export class MarketBenchmarkService {
  /**
   * Static market benchmark data (can be upgraded to dynamic data source)
   * This is a simplified dataset of regional medians
   */
  private static MARKET_DATA: BenchmarkData[] = [
    // Portugal - Lisbon
    {
      regionId: 'pt-lisbon',
      propertyType: 'apartment',
      medianPrice: 95,
      trend: 'up',
      sampleSize: 2500,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-lisbon',
      propertyType: 'house',
      medianPrice: 125,
      trend: 'up',
      sampleSize: 1800,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-lisbon',
      propertyType: 'villa',
      medianPrice: 185,
      trend: 'stable',
      sampleSize: 600,
      lastUpdated: '2026-07-22',
    },
    // Portugal - Porto
    {
      regionId: 'pt-porto',
      propertyType: 'apartment',
      medianPrice: 65,
      trend: 'up',
      sampleSize: 1500,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-porto',
      propertyType: 'house',
      medianPrice: 85,
      trend: 'up',
      sampleSize: 900,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-porto',
      propertyType: 'villa',
      medianPrice: 120,
      trend: 'stable',
      sampleSize: 300,
      lastUpdated: '2026-07-22',
    },
    // Portugal - Algarve
    {
      regionId: 'pt-algarve',
      propertyType: 'apartment',
      medianPrice: 85,
      trend: 'up',
      sampleSize: 2000,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-algarve',
      propertyType: 'house',
      medianPrice: 110,
      trend: 'up',
      sampleSize: 1200,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'pt-algarve',
      propertyType: 'villa',
      medianPrice: 160,
      trend: 'stable',
      sampleSize: 800,
      lastUpdated: '2026-07-22',
    },
    // Spain - Barcelona
    {
      regionId: 'es-barcelona',
      propertyType: 'apartment',
      medianPrice: 105,
      trend: 'up',
      sampleSize: 3000,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'es-barcelona',
      propertyType: 'house',
      medianPrice: 140,
      trend: 'up',
      sampleSize: 2000,
      lastUpdated: '2026-07-22',
    },
    {
      regionId: 'es-barcelona',
      propertyType: 'villa',
      medianPrice: 200,
      trend: 'stable',
      sampleSize: 800,
      lastUpdated: '2026-07-22',
    },
  ];

  /**
   * Get market benchmark for a property
   * Falls back to default if region not found
   */
  static getBenchmark(
    region: string | undefined,
    propertyType: string,
    features: PropertyFeatures
  ): MarketAnalysis {
    // Find exact match
    let benchmark = this.MARKET_DATA.find(
      (data) => data.regionId === region && data.propertyType === propertyType.toLowerCase()
    );

    // Fall back to default if region not found
    if (!benchmark) {
      benchmark = this.getDefaultBenchmark(propertyType);
    }

    // Calculate adjustment based on features
    const adjustment = this.calculateFeatureAdjustment(features, benchmark);
    const adjustedMedian = Math.round(benchmark.medianPrice * (1 + adjustment) * 100) / 100;

    return {
      median_price: adjustedMedian,
      market_trend: benchmark.trend,
      competitor_avg: Math.round(benchmark.medianPrice * 100) / 100,
      sample_size: benchmark.sampleSize,
    };
  }

  /**
   * Get default benchmark when region data not available
   */
  private static getDefaultBenchmark(propertyType: string): BenchmarkData {
    const type = propertyType.toLowerCase();

    // Return global average for property type
    if (type === 'villa') {
      return {
        regionId: 'global',
        propertyType: 'villa',
        medianPrice: 150,
        trend: 'stable',
        sampleSize: 2500,
        lastUpdated: '2026-07-22',
      };
    } else if (type === 'house') {
      return {
        regionId: 'global',
        propertyType: 'house',
        medianPrice: 100,
        trend: 'stable',
        sampleSize: 3500,
        lastUpdated: '2026-07-22',
      };
    } else {
      // Default to apartment
      return {
        regionId: 'global',
        propertyType: 'apartment',
        medianPrice: 80,
        trend: 'stable',
        sampleSize: 4000,
        lastUpdated: '2026-07-22',
      };
    }
  }

  /**
   * Calculate adjustment factor based on property features
   * Higher-end features warrant price premium, lower-end features warrant discount
   */
  private static calculateFeatureAdjustment(
    features: PropertyFeatures,
    benchmark: BenchmarkData
  ): number {
    let adjustment = 0;

    // Bedroom adjustment (each bed adds ~5-10% premium)
    const bedAdjustment = (features.beds - 2) * 0.05; // Base assumption: 2 bedrooms
    adjustment += Math.max(Math.min(bedAdjustment, 0.3), -0.2); // Cap at ±20-30%

    // Bathroom adjustment (each bath adds ~3% premium)
    const bathAdjustment = (features.baths - 1) * 0.03;
    adjustment += Math.max(Math.min(bathAdjustment, 0.15), -0.1);

    // Amenities adjustment (premium amenities add 2% each, max 15%)
    const premiumAmenities = [
      'pool',
      'hot_tub',
      'gym',
      'sauna',
      'wine_cellar',
      'home_theater',
      'game_room',
    ];
    const premiumCount = features.amenities.filter((a) =>
      premiumAmenities.includes(a.toLowerCase())
    ).length;
    adjustment += Math.min(premiumCount * 0.02, 0.15);

    // Cap total adjustment to ±35%
    return Math.max(Math.min(adjustment, 0.35), -0.35);
  }

  /**
   * Get all available benchmarks for a region
   */
  static getBenchmarksForRegion(region: string): BenchmarkData[] {
    return this.MARKET_DATA.filter((data) => data.regionId === region);
  }

  /**
   * Get available regions
   */
  static getAvailableRegions(): string[] {
    return Array.from(new Set(this.MARKET_DATA.map((data) => data.regionId)));
  }

  /**
   * Update market data (for future API integration)
   */
  static updateBenchmark(data: BenchmarkData): void {
    const index = this.MARKET_DATA.findIndex(
      (bd) => bd.regionId === data.regionId && bd.propertyType === data.propertyType
    );

    if (index >= 0) {
      this.MARKET_DATA[index] = { ...data, lastUpdated: new Date().toISOString() };
    } else {
      this.MARKET_DATA.push({ ...data, lastUpdated: new Date().toISOString() });
    }
  }
}
