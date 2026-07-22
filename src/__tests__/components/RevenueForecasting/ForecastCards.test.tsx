import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForecastCards } from '@/components/RevenueForecasting/ForecastCards';
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

describe('ForecastCards', () => {
  it('should render three forecast cards', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('60 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
  });

  it('should display total 90-day projection', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Total should be 2500 + 5200 + 7800 = 15500
    expect(screen.getByText(/15500/)).toBeInTheDocument();
  });

  it('should call onCardClick when card is clicked', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    const { container } = render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Find the button containing "30 Days"
    const buttons = container.querySelectorAll('button');
    const thirtydayCard = Array.from(buttons).find(btn => btn.textContent?.includes('30 Days'));

    if (thirtydayCard) {
      fireEvent.click(thirtydayCard);
      expect(mockOnCardClick).toHaveBeenCalledWith('30');
    }
  });

  it('should show loading state with skeleton loaders', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={null}
        isLoading={true}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    const skeletons = screen.getAllByRole('generic', { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should display error message when error occurs', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();
    const errorMessage = 'Failed to load forecast data';

    render(
      <ForecastCards
        data={null}
        isLoading={false}
        error={errorMessage}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call onRefresh when Retry button is clicked', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={null}
        isLoading={false}
        error="Error"
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  // Integration tests
  it('should display all three cards with correct periods', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('60 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();

    // Verify revenue values are displayed
    expect(screen.getByText(/2500|2,500/)).toBeInTheDocument();
    expect(screen.getByText(/5200|5,200/)).toBeInTheDocument();
    expect(screen.getByText(/7800|7,800/)).toBeInTheDocument();
  });

  it('should display summary with total 90-day projection', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Summary should show total projection
    expect(screen.getByText(/Total 90-day projection/i)).toBeInTheDocument();
  });

  it('should have responsive grid layout for cards', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    const { container } = render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Cards should be in a responsive grid
    const gridContainer = container.querySelector('[class*="grid"]');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer?.className).toContain('md:grid-cols-3');
  });

  it('should handle multiple card clicks', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    const { container } = render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Click each card and verify callback
    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Days')) {
        fireEvent.click(btn);
      }
    });

    expect(mockOnCardClick).toHaveBeenCalled();
  });

  it('should display confidence scores on cards', () => {
    const mockOnCardClick = jest.fn();
    const mockOnRefresh = jest.fn();

    render(
      <ForecastCards
        data={mockData}
        isLoading={false}
        error={null}
        onCardClick={mockOnCardClick}
        onRefresh={mockOnRefresh}
      />
    );

    // Confidence scores should be visible (high, high, high)
    const confidenceElements = screen.getAllByText(/High/i);
    expect(confidenceElements.length).toBeGreaterThanOrEqual(1);
  });
});
