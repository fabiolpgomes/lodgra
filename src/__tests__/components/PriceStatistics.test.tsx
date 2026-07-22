/**
 * Story 36.7: Price Statistics Component Tests
 * Test statistics display and metrics
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PriceStatisticsComponent } from '@/components/PricingAnalytics/PriceStatistics';
import { PriceStatistics } from '@/types/pricing.types';

describe('PriceStatisticsComponent', () => {
  const mockStats: PriceStatistics = {
    minPrice: 100,
    maxPrice: 200,
    avgPrice: 150,
    changeCount: 10,
    stdDeviation: 25.5,
  };

  it('should render statistics cards', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('Minimum Price')).toBeInTheDocument();
    expect(screen.getByText('Maximum Price')).toBeInTheDocument();
    expect(screen.getByText('Average Price')).toBeInTheDocument();
    expect(screen.getByText('Price Changes')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<PriceStatisticsComponent stats={null} loading={true} />);

    const loaders = screen.getAllByRole('img', { hidden: true });
    expect(loaders.length).toBeGreaterThan(0);
  });

  it('should show no data state', () => {
    render(<PriceStatisticsComponent stats={null} loading={false} />);

    expect(screen.getByText('No statistics available')).toBeInTheDocument();
  });

  it('should display standard deviation when available', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('Price Volatility (Std Dev)')).toBeInTheDocument();
  });

  it('should display metric icons', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('📉')).toBeInTheDocument(); // Min
    expect(screen.getByText('📈')).toBeInTheDocument(); // Max
    expect(screen.getByText('📊')).toBeInTheDocument(); // Avg
    expect(screen.getByText('🔄')).toBeInTheDocument(); // Changes
  });

  it('should handle stats without standard deviation', () => {
    const statsNoStdDev = { ...mockStats, stdDeviation: undefined };
    render(<PriceStatisticsComponent stats={statsNoStdDev} />);

    expect(screen.queryByText('Price Volatility')).not.toBeInTheDocument();
  });

  it('should handle zero values', () => {
    const zeroStats: PriceStatistics = {
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      changeCount: 0,
      stdDeviation: 0,
    };

    render(<PriceStatisticsComponent stats={zeroStats} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should format prices with currency', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    const elements = screen.getAllByText(/€|EUR/);
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should display correct metric colors', () => {
    const { container } = render(
      <PriceStatisticsComponent stats={mockStats} />
    );

    expect(container.textContent).toContain('text-green-600'); // Min
    expect(container.textContent).toContain('text-red-600'); // Max
    expect(container.textContent).toContain('text-blue-600'); // Avg
  });
});
