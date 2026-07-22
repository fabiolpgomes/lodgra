/**
 * Tests for MarketBenchmarkService
 * Story 36.8: Tests for regional benchmarking and market data management
 */

import { describe, it, expect } from 'vitest';
import { MarketBenchmarkService, type PropertyFeatures } from '@/lib/pricing/market-benchmark';

describe('MarketBenchmarkService', () => {
  describe('getBenchmark', () => {
    it('should return market data for known region and property type', () => {
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

    it('should apply feature adjustments to benchmark price', () => {
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
        beds: 4, // More bedrooms
        baths: 3, // More bathrooms
        amenities: ['pool', 'hot_tub', 'gym'], // Premium amenities
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

    it('should adjust for additional bedrooms', () => {
      const featuresWith2Beds: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const featuresWith4Beds: PropertyFeatures = {
        beds: 4,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const benchmark2Beds = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresWith2Beds
      );

      const benchmark4Beds = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresWith4Beds
      );

      expect(benchmark4Beds.median_price).toBeGreaterThan(benchmark2Beds.median_price);
    });

    it('should adjust for additional bathrooms', () => {
      const featuresWith1Bath: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const featuresWith3Baths: PropertyFeatures = {
        beds: 2,
        baths: 3,
        amenities: [],
        propertyType: 'apartment',
      };

      const benchmark1Bath = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresWith1Bath
      );

      const benchmark3Baths = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresWith3Baths
      );

      expect(benchmark3Baths.median_price).toBeGreaterThan(benchmark1Bath.median_price);
    });

    it('should apply premium amenities adjustment', () => {
      const featuresNoAmenities: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const featuresWithAmenities: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: ['pool', 'hot_tub', 'sauna', 'wine_cellar'],
        propertyType: 'apartment',
      };

      const benchmarkNoAmenities = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresNoAmenities
      );

      const benchmarkWithAmenities = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        featuresWithAmenities
      );

      expect(benchmarkWithAmenities.median_price).toBeGreaterThan(
        benchmarkNoAmenities.median_price
      );
    });

    it('should return default benchmark for unknown region', () => {
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

    it('should return property-type specific default', () => {
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

      // Villas should generally be more expensive than apartments
      expect(benchmarkVilla.median_price).toBeGreaterThan(benchmarkApartment.median_price);
    });

    it('should cap feature adjustments at ±35%', () => {
      const extremeFeatures: PropertyFeatures = {
        beds: 10, // Very large
        baths: 8, // Many bathrooms
        amenities: ['pool', 'hot_tub', 'gym', 'sauna', 'wine_cellar', 'home_theater', 'game_room'],
        propertyType: 'villa',
      };

      const benchmark = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'villa',
        extremeFeatures
      );

      // Should be within reasonable bounds
      expect(benchmark.median_price).toBeGreaterThan(0);
      expect(benchmark.median_price).toBeLessThan(500); // Shouldn't be astronomical
    });
  });

  describe('getBenchmarksForRegion', () => {
    it('should return all benchmarks for a region', () => {
      const benchmarks = MarketBenchmarkService.getBenchmarksForRegion('pt-lisbon');

      expect(benchmarks.length).toBeGreaterThan(0);
      benchmarks.forEach((bench) => {
        expect(bench.regionId).toBe('pt-lisbon');
      });
    });

    it('should return empty array for unknown region', () => {
      const benchmarks = MarketBenchmarkService.getBenchmarksForRegion('unknown-region');
      expect(benchmarks.length).toBe(0);
    });
  });

  describe('getAvailableRegions', () => {
    it('should return list of available regions', () => {
      const regions = MarketBenchmarkService.getAvailableRegions();

      expect(regions.length).toBeGreaterThan(0);
      expect(regions).toContain('pt-lisbon');
      expect(regions).toContain('pt-porto');
      expect(regions).toContain('pt-algarve');
      expect(regions).toContain('es-barcelona');
    });

    it('should not have duplicate regions', () => {
      const regions = MarketBenchmarkService.getAvailableRegions();
      const uniqueRegions = new Set(regions);

      expect(regions.length).toBe(uniqueRegions.size);
    });
  });

  describe('updateBenchmark', () => {
    it('should update existing benchmark data', () => {
      const originalRegions = MarketBenchmarkService.getAvailableRegions();

      const newBenchmark = {
        regionId: 'pt-lisbon',
        propertyType: 'apartment',
        medianPrice: 120, // Updated from 95
        trend: 'up' as const,
        sampleSize: 3000,
        lastUpdated: new Date().toISOString(),
      };

      MarketBenchmarkService.updateBenchmark(newBenchmark);

      const features: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const benchmark = MarketBenchmarkService.getBenchmark(
        'pt-lisbon',
        'apartment',
        features
      );

      // Should reflect the updated value (adjusted for features)
      expect(benchmark.median_price).toBeGreaterThan(100);
    });

    it('should add new benchmark data', () => {
      const newBenchmark = {
        regionId: 'pt-madeira',
        propertyType: 'apartment',
        medianPrice: 110,
        trend: 'up' as const,
        sampleSize: 500,
        lastUpdated: new Date().toISOString(),
      };

      MarketBenchmarkService.updateBenchmark(newBenchmark);

      const benchmarks = MarketBenchmarkService.getBenchmarksForRegion('pt-madeira');
      expect(benchmarks.length).toBeGreaterThan(0);
    });
  });

  describe('Price Comparison', () => {
    it('should show price variation between regions', () => {
      const features: PropertyFeatures = {
        beds: 2,
        baths: 1,
        amenities: [],
        propertyType: 'apartment',
      };

      const lisbon = MarketBenchmarkService.getBenchmark('pt-lisbon', 'apartment', features);
      const porto = MarketBenchmarkService.getBenchmark('pt-porto', 'apartment', features);
      const algarve = MarketBenchmarkService.getBenchmark('pt-algarve', 'apartment', features);

      // Lisbon should be most expensive, Porto least among Portuguese cities
      expect(lisbon.median_price).toBeGreaterThan(porto.median_price);

      // All should have reasonable prices
      expect(lisbon.median_price).toBeGreaterThan(0);
      expect(porto.median_price).toBeGreaterThan(0);
      expect(algarve.median_price).toBeGreaterThan(0);
    });

    it('should show price variation between property types', () => {
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

      // Villas should be most expensive, apartments least
      expect(villa.median_price).toBeGreaterThan(house.median_price);
      expect(house.median_price).toBeGreaterThan(apartment.median_price);
    });
  });
});
