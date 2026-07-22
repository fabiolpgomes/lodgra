import { generateForecastCSV } from '@/lib/export/csvExport';
import { ForecastingAPIResponse } from '@/types/forecasting';

// Mock document methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(global.document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
  },
  writable: true,
});

describe('generateForecastCSV', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateElement.mockReturnValue({
      setAttribute: jest.fn(),
      click: jest.fn(),
      style: {},
    });
  });

  it('should generate CSV with correct structure', () => {
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

    expect(() => {
      generateForecastCSV(mockData, 'My Property', '2026-07-22', '2026-10-20');
    }).not.toThrow();

    expect(mockCreateElement).toHaveBeenCalledWith('a');
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it('should handle special characters in property name', () => {
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
          reasoning: 'Test',
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
          reasoning: 'Test',
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
          reasoning: 'Test',
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
        trendsDescription: 'Upward',
        seasonalityDescription: 'Peak',
        recommendations: ['Price up'],
      },
    };

    expect(() => {
      generateForecastCSV(mockData, 'My "Special" Property & More', '2026-07-22', '2026-10-20');
    }).not.toThrow();
  });
});
