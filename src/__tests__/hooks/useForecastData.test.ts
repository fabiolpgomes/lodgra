import { renderHook, waitFor } from '@testing-library/react';
import { useForecastData } from '@/hooks/useForecastData';
import { ForecastingAPIResponse } from '@/types/forecasting';

// Mock fetch
global.fetch = jest.fn();

describe('useForecastData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch forecast data on mount', async () => {
    const mockData: ForecastingAPIResponse = {
      forecasts: {
        days30: {
          id: '1',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 30,
          projectedRevenue: 2500,
          confidenceScore: 0.85,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.75,
          seasonalFactor: 1.1,
          basePriceEstimate: 95,
          dataPointsCount: 15,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days60: {
          id: '2',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 60,
          projectedRevenue: 5200,
          confidenceScore: 0.8,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.73,
          seasonalFactor: 1.05,
          basePriceEstimate: 94,
          dataPointsCount: 30,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days90: {
          id: '3',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 90,
          projectedRevenue: 7800,
          confidenceScore: 0.75,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.72,
          seasonalFactor: 1.0,
          basePriceEstimate: 93,
          dataPointsCount: 45,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
      },
      assumptions: {
        id: 'assum1',
        propertyId: 'prop1',
        analysisDate: '2026-07-22',
        baseRevenue90Days: 7800,
        avgOccupancyRate: 0.73,
        seasonalPattern: { 6: 1.1, 7: 1.15, 8: 1.2 },
        dayOfWeekPattern: { 4: 1.1, 5: 1.15, 6: 1.2 },
        holidayEvents: [{ date: '2026-08-15', name: 'Summer Peak', expectedImpact: 0.2 }],
        last90DaysBookings: 15,
        createdAt: '2026-07-22',
      },
      chartData: [
        { date: '2026-07-23', projected: 85, lower: 72, upper: 98 },
        { date: '2026-07-24', projected: 87, lower: 74, upper: 100 },
      ],
      summary: {
        currentMonthProjection: 2500,
        nextMonthProjection: 2700,
        quarterlyProjection: 7800,
        trendsDescription: 'Upward trend expected',
        seasonalityDescription: 'Summer peak season',
        recommendations: ['Increase prices', 'Promote on social media'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useForecastData('prop1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    const errorMessage = 'Network error';
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useForecastData('prop1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should cache fetched data in localStorage', async () => {
    const mockData: ForecastingAPIResponse = {
      forecasts: {
        days30: {
          id: '1',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 30,
          projectedRevenue: 2500,
          confidenceScore: 0.85,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.75,
          seasonalFactor: 1.1,
          basePriceEstimate: 95,
          dataPointsCount: 15,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days60: {
          id: '2',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 60,
          projectedRevenue: 5200,
          confidenceScore: 0.8,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.73,
          seasonalFactor: 1.05,
          basePriceEstimate: 94,
          dataPointsCount: 30,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
        days90: {
          id: '3',
          propertyId: 'prop1',
          forecastDate: '2026-07-22',
          forecastPeriodDays: 90,
          projectedRevenue: 7800,
          confidenceScore: 0.75,
          confidenceLevel: 'high',
          occupancyRateForecast: 0.72,
          seasonalFactor: 1.0,
          basePriceEstimate: 93,
          dataPointsCount: 45,
          reasoning: 'Based on historical data',
          createdAt: '2026-07-22',
          updatedAt: '2026-07-22',
        },
      },
      assumptions: {
        id: 'assum1',
        propertyId: 'prop1',
        analysisDate: '2026-07-22',
        baseRevenue90Days: 7800,
        avgOccupancyRate: 0.73,
        seasonalPattern: null,
        dayOfWeekPattern: null,
        holidayEvents: null,
        last90DaysBookings: 15,
        createdAt: '2026-07-22',
      },
      chartData: [
        { date: '2026-07-23', projected: 85, lower: 72, upper: 98 },
      ],
      summary: {
        currentMonthProjection: 2500,
        nextMonthProjection: 2700,
        quarterlyProjection: 7800,
        trendsDescription: 'Upward trend',
        seasonalityDescription: 'Summer peak',
        recommendations: ['Increase prices'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    renderHook(() => useForecastData('prop1'));

    await waitFor(() => {
      const cached = localStorage.getItem('forecast_cache_prop1');
      expect(cached).toBeTruthy();
    });
  });
});
