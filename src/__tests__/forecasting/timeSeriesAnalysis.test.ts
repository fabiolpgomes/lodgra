/**
 * Tests for time-series analysis (Story 36.9)
 */

import {
  calculateSMA,
  analyzeTimeSeries,
  generateForecast,
  calculateOccupancyForecast,
  estimateBasePrice,
  BookingData,
} from '@/lib/forecasting/timeSeriesAnalysis';

describe('Time Series Analysis', () => {
  const createBookingData = (daysBack: number, dailyRevenue: number): BookingData[] => {
    const data: BookingData[] = [];
    for (let i = 0; i < daysBack; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date,
        revenue: dailyRevenue + Math.random() * 20, // Add some variance
        occupancy: true,
      });
    }
    return data;
  };

  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const sma = calculateSMA(values, 2);

      expect(sma[0]).toBe(15); // (10+20)/2
      expect(sma[1]).toBe(25); // (20+30)/2
      expect(sma[2]).toBe(35); // (30+40)/2
    });

    it('should handle insufficient data', () => {
      const values = [10, 20];
      const sma = calculateSMA(values, 5);

      expect(sma).toEqual(values);
    });
  });

  describe('analyzeTimeSeries', () => {
    it('should calculate average revenue correctly', () => {
      const bookings = createBookingData(30, 100);
      const analysis = analyzeTimeSeries(bookings);

      expect(analysis.averageRevenue).toBeGreaterThan(95);
      expect(analysis.averageRevenue).toBeLessThan(125);
    });

    it('should detect trends', () => {
      const bookings: BookingData[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Increasing trend
        bookings.push({
          date,
          revenue: 100 + i * 2,
          occupancy: true,
        });
      }

      const analysis = analyzeTimeSeries(bookings);
      expect(analysis.trend).toBe('increasing');
    });

    it('should calculate volatility', () => {
      const bookings = createBookingData(30, 100);
      const analysis = analyzeTimeSeries(bookings);

      expect(analysis.volatility).toBeGreaterThan(0);
    });

    it('should handle empty bookings', () => {
      const analysis = analyzeTimeSeries([]);

      expect(analysis.averageRevenue).toBe(0);
      expect(analysis.volatility).toBe(0);
    });
  });

  describe('generateForecast', () => {
    it('should generate 30-day forecast', () => {
      const bookings = createBookingData(90, 100);
      const forecast = generateForecast(bookings, 30);

      expect(forecast.length).toBe(30);
      forecast.forEach(point => {
        expect(point.projectedRevenue).toBeGreaterThan(0);
        expect(point.confidenceInterval.upper).toBeGreaterThan(
          point.projectedRevenue
        );
        expect(point.confidenceInterval.lower).toBeLessThan(
          point.projectedRevenue
        );
      });
    });

    it('should handle empty bookings', () => {
      const forecast = generateForecast([], 30);
      expect(forecast.length).toBe(0);
    });
  });

  describe('calculateOccupancyForecast', () => {
    it('should calculate occupancy rate', () => {
      const bookings = createBookingData(30, 100);
      const occupancy = calculateOccupancyForecast(bookings);

      expect(occupancy).toBeGreaterThanOrEqual(0);
      expect(occupancy).toBeLessThanOrEqual(100);
    });

    it('should return 0 for empty bookings', () => {
      const occupancy = calculateOccupancyForecast([]);
      expect(occupancy).toBe(0);
    });
  });

  describe('estimateBasePrice', () => {
    it('should estimate base price from revenue', () => {
      const bookings: BookingData[] = [
        { date: new Date(), revenue: 100, occupancy: true },
        { date: new Date(), revenue: 120, occupancy: true },
        { date: new Date(), revenue: 110, occupancy: true },
      ];

      const basePrice = estimateBasePrice(bookings);
      expect(basePrice).toBeCloseTo(110, 5);
    });

    it('should return 0 for empty bookings', () => {
      const basePrice = estimateBasePrice([]);
      expect(basePrice).toBe(0);
    });
  });
});
