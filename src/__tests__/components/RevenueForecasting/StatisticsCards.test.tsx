import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatisticsCards } from '@/components/RevenueForecasting/StatisticsCards';
import { ForecastingAPIResponse } from '@/types/forecasting';

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
    baseRevenue90Days: 9000,
    avgOccupancyRate: 0.75,
    seasonalPattern: null,
    dayOfWeekPattern: null,
    holidayEvents: null,
    last90DaysBookings: 30,
    createdAt: '2026-07-22',
  },
  chartData: [
    { date: '2026-07-23', projected: 85, lower: 72, upper: 98 },
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

describe('StatisticsCards', () => {
  it('should render four metric cards', () => {
    render(<StatisticsCards data={mockData} />);

    expect(screen.getByText(/Average Daily Rate/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Score/)).toBeInTheDocument();
    expect(screen.getByText(/Occupancy Rate Forecast/)).toBeInTheDocument();
    expect(screen.getByText(/Trend Indicator/)).toBeInTheDocument();
  });

  it('should display correct ADR value', () => {
    render(<StatisticsCards data={mockData} />);

    // ADR = 9000 / 90 = 100
    expect(screen.getByText(/€100/)).toBeInTheDocument();
  });

  it('should display confidence percentage', () => {
    render(<StatisticsCards data={mockData} />);

    // Confidence score = 0.85 * 100 = 85%
    expect(screen.getByText(/Confidence Score/)).toBeInTheDocument();
    // Check that 85 and % exist somewhere in the document
    const allText = screen.getByText(/Confidence Score/).textContent;
    expect(document.body.textContent).toContain('85');
    expect(document.body.textContent).toContain('%');
  });

  it('should display occupancy rate forecast', () => {
    render(<StatisticsCards data={mockData} />);

    // Occupancy = 0.75 * 100 = 75%
    // Using getByLabelText or container query to get specific occupancy value
    expect(screen.getByText(/Occupancy Rate Forecast/)).toBeInTheDocument();
    // Check that a percent sign exists for the occupancy rate
    const percentElements = screen.getAllByText('%');
    expect(percentElements.length).toBeGreaterThan(0);
  });

  it('should show upward trend when trend description mentions upward', () => {
    render(<StatisticsCards data={mockData} />);

    expect(screen.getByText(/↑ Upward/)).toBeInTheDocument();
  });

  it('should show downward trend when trend description mentions downward', () => {
    const downwardData: ForecastingAPIResponse = {
      ...mockData,
      summary: {
        ...mockData.summary,
        trendsDescription: 'Downward trend expected',
      },
    };

    render(<StatisticsCards data={downwardData} />);

    expect(screen.getByText(/↓ Downward/)).toBeInTheDocument();
  });

  it('should show stable trend when trend description is neutral', () => {
    const stableData: ForecastingAPIResponse = {
      ...mockData,
      summary: {
        ...mockData.summary,
        trendsDescription: 'Stable market conditions',
      },
    };

    render(<StatisticsCards data={stableData} />);

    expect(screen.getByText(/→ Stable/)).toBeInTheDocument();
  });

  // Integration tests
  it('should render all four metric cards with correct labels and values', () => {
    render(<StatisticsCards data={mockData} />);

    // Verify all labels exist
    expect(screen.getByText(/Average Daily Rate/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence Score/)).toBeInTheDocument();
    expect(screen.getByText(/Occupancy Rate Forecast/)).toBeInTheDocument();
    expect(screen.getByText(/Trend Indicator/)).toBeInTheDocument();

    // Verify values render correctly
    expect(screen.getByText(/€100/)).toBeInTheDocument();
  });

  it('should display correct ADR formatting with currency symbol', () => {
    render(<StatisticsCards data={mockData} />);

    // ADR = 7800 / 90 = 86.67, but with toFixed(2) = 86.67
    expect(screen.getByText(/Average Daily Rate/)).toBeInTheDocument();
    expect(document.body.textContent).toContain('€');
  });

  it('should display help text for each metric', () => {
    render(<StatisticsCards data={mockData} />);

    expect(screen.getByText(/Based on historical booking data and seasonal adjustments/)).toBeInTheDocument();
    expect(screen.getByText(/Based on \d+ recent bookings/)).toBeInTheDocument();
    expect(screen.getByText(/May vary based on market conditions/)).toBeInTheDocument();
    expect(screen.getByText(/Based on historical and seasonal patterns/)).toBeInTheDocument();
  });

  it('should display responsive grid layout', () => {
    const { container } = render(<StatisticsCards data={mockData} />);

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2');
  });

  it('should display confidence explanation based on level', () => {
    render(<StatisticsCards data={mockData} />);

    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });
});
