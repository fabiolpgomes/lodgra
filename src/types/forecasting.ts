/**
 * TypeScript types for revenue forecasting (Story 36.9)
 */

export interface RevenueForecast {
  id: string;
  propertyId: string;
  forecastDate: string;
  forecastPeriodDays: 30 | 60 | 90;
  projectedRevenue: number;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  occupancyRateForecast: number | null;
  seasonalFactor: number | null;
  basePriceEstimate: number | null;
  dataPointsCount: number;
  reasoning: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastAssumptions {
  id: string;
  propertyId: string;
  analysisDate: string;
  baseRevenue90Days: number;
  avgOccupancyRate: number;
  seasonalPattern: Record<number, number> | null;
  dayOfWeekPattern: Record<number, number> | null;
  holidayEvents: HolidayEvent[] | null;
  last90DaysBookings: number;
  createdAt: string;
}

export interface HolidayEvent {
  date: string;
  name: string;
  expectedImpact: number;
}

export interface ForecastingAPIResponse {
  forecasts: {
    days30: RevenueForecast;
    days60: RevenueForecast;
    days90: RevenueForecast;
  };
  assumptions: ForecastAssumptions;
  chartData: ForecastChartPoint[];
  summary: ForecastSummary;
}

export interface ForecastChartPoint {
  date: string;
  projected: number;
  lower: number;
  upper: number;
}

export interface ForecastSummary {
  currentMonthProjection: number;
  nextMonthProjection: number;
  quarterlyProjection: number;
  trendsDescription: string;
  seasonalityDescription: string;
  recommendations: string[];
}

export interface ForecastingHookData {
  isLoading: boolean;
  error: string | null;
  data: ForecastingAPIResponse | null;
  refresh: () => Promise<void>;
}
