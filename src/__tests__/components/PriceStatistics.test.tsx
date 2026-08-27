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

    expect(screen.getByText('Preço mínimo')).toBeInTheDocument();
    expect(screen.getByText('Preço máximo')).toBeInTheDocument();
    expect(screen.getByText('Preço médio')).toBeInTheDocument();
    expect(screen.getByText('Alterações de preço')).toBeInTheDocument();
  });

  it('should display correct values', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<PriceStatisticsComponent stats={null} loading={true} />);

    // Look for loading pulse elements
    const pulses = document.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('should show no data state', () => {
    render(<PriceStatisticsComponent stats={null} loading={false} />);

    expect(screen.getByText('Sem estatísticas disponíveis')).toBeInTheDocument();
  });

  it('should display standard deviation when available', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('Volatilidade do preço (desvio padrão)')).toBeInTheDocument();
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

    expect(screen.queryByText('Volatilidade do preço')).not.toBeInTheDocument();
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

  it('should format prices without implicit currency', () => {
    render(<PriceStatisticsComponent stats={mockStats} />);

    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();
    expect(screen.getByText('150.00')).toBeInTheDocument();
  });

  it('should display correct metric colors', () => {
    const { container } = render(
      <PriceStatisticsComponent stats={mockStats} />
    );

    // Check that class names are applied to elements (in HTML, not text content)
    expect(container.innerHTML).toContain('text-emerald-700'); // Min
    expect(container.innerHTML).toContain('text-red-600'); // Max
    expect(container.innerHTML).toContain('text-blue-600'); // Avg
  });
});
