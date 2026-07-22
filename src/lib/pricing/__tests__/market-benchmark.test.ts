/**
 * Tests for MarketBenchmarkService
 * Story 36.8: Tests for regional benchmarking and market data management
 */

import { MarketBenchmarkService, type PropertyFeatures } from '@/lib/pricing/market-benchmark';

describe('MarketBenchmarkService', () => {
  describe('getBenchmark', () => {
    test('should return market data for known region and property type', () => {
      const features: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
        region: 'pt-lisbon',
      };

      const benchmark = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        features
      );

      expect(benchmark.median_price).toBeGreaterThan(0);
      expect(['up', 'down', 'stable']).toContain(benchmark.market_trend);
      expect(benchmark.sample_size).toBeGreaterThan(0);
      expect(benchmark.competitor_avg).toBeGreaterThan(0);
    });

    test('should apply feature adjustments to benchmark price', () => {
      const baselineFeatures: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
        region: 'pt-lisbon',
      };

      const benchmarkBaseline = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        baselineFeatures
      );

      const premiumFeatures: PropertyFeatures = {
        beds: 4,
        baths: 3,
        amenities: ['pool', 'hot_tub', 'gym'],
        propertyType: 'apartment',
        region: 'pt-lisbon',
      };

      const benchmarkPremium = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        premiumFeatures
      );

      expect(benchmarkPremium.median_price).toBeGreaterThan(benchmarkBaseline.median_price);
    });

    test('should return default benchmark for unknown region', () => {
      const features: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const benchmark = MarketBenchmarkService.getBenchmark(
        'unknown-region',
        'apartment',
        features
      );

      expect(benchmark.median_price).toBeGreaterThan(0);
      expect(['up', 'down', 'stable']).toContain(benchmark.market_trend);
      expect(benchmark.sample_size).toBeGreaterThan(0);
    });

    test('should return property-type specific default', () => {
      const featuresVilla: PropertyFeatures = {
        beds: 4,
        baths: 3,
        amenities: [],
        propertyType: 'villa',
      };

      const featuresApartment: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const benchmarkVilla = MarketBenchmarkService.getBenchmark(
        'unknown-region',
        'villa',
        featuresVilla
      );

      const benchmarkApartment = MarketBenchmarkService.getBenchmark(
        'unknown-region',
        'apartment',
        featuresApartment
      );

      expect(benchmarkVilla.median_price).toBeGreaterThan(benchmarkApartment.median_price);
    });
  });

  describe('getBenchmarksForRegion', () => {
    test('should return all benchmarks for a region', () => {
      const benchmarks = MarketBenchmarkService.getBenchmarksForRegion('pt-lisbon');

      expect(benchmarks.length).toBeGreaterThan(0);
      benchmarks.forEach((bench) => {
        expect(bench.regionId).toBe('pt-lisbon');
      });
    });

    test('should return empty array for unknown region', () => {
      const benchmarks = MarketBenchmarkService.getBenchmarksForRegion('unknown-region');
      expect(benchmarks.length).toBe(0);
    });
  });

  describe('getAvailableRegions', () => {
    test('should return list of available regions', () => {
      const regions = MarketBenchmarkService.getAvailableRegions();

      expect(regions.length).toBeGreaterThan(0);
      expect(regions).toContain('pt-lisbon');
      expect(regions).toContain('pt-porto');
      expect(regions).toContain('pt-algarve');
      expect(regions).toContain('es-barcelona');
    });

    test('should not have duplicate regions', () => {
      const regions = MarketBenchmarkService.getAvailableRegions();
      const uniqueRegions = new Set(regions);

      expect(regions.length).toBe(uniqueRegions.size);
    });
  });

  describe('Price Comparison', () => {
    test('should show price variation between regions', () => {
      const features: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const lisbon = MarketBenchmarkService.getBenchmark('pt-lisbon', 'apartment', features);
      const porto = MarketBenchmarkService.getBenchmark('pt-porto', 'apartment', features);

      expect(lisbon.median_price).toBeGreaterThan(porto.median_price);
      expect(lisbon.median_price).toBeGreaterThan(0);
      expect(porto.median_price).toBeGreaterThan(0);
    });

    test('should show price variation between property types', () => {
      const features: PropertyFeatures = {
        beds: 3,
        baths: 2,
        amenities: [],
        propertyType: 'apartment',
        region: 'pt-lisbon',
      };

      const apartment = MarketBenchmarkService.getBenchmark('pt-lisbon', 'apartment', features);
      const house = MarketBenchmarkService.getBenchmark('pt-lisbon', 'house', features);
      const villa = MarketBenchmarkService.getBenchmark('pt-lisbon', 'villa', features);

      expect(villa.median_price).toBeGreaterThan(house.median_price);
      expect(house.median_price).toBeGreaterThan(apartment.median_price);
    });
  });
});
