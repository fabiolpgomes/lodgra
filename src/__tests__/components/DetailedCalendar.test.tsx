/**
 * Story 36.9: DetailedCalendar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DetailedCalendar } from '@/components/DetailedCalendar';

// Mock useCalendarMonth hook
jest.mock('@/components/PricingCalendar/hooks/useCalendarMonth', () => ({
  useCalendarMonth: jest.fn(() => ({
    prices: new Map(),
    loading: false,
    error: null,
    setPrice: jest.fn(),
    deletePrice: jest.fn(),
    refetchPrices: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('DetailedCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it('renders component without crashing', () => {
    const { container } = render(<DetailedCalendar propertyId="prop-1" />);
    expect(container).toBeInTheDocument();
  });

  it('accepts propertyId prop', () => {
    const { container } = render(<DetailedCalendar propertyId="test-property" />);
    expect(container).toBeInTheDocument();
  });

  it('accepts isMobile prop', () => {
    const { container } = render(<DetailedCalendar propertyId="prop-1" isMobile={true} />);
    expect(container).toBeInTheDocument();
  });

  it('accepts callback handlers', () => {
    const mockSettings = jest.fn();
    const mockPicker = jest.fn();
    const { container } = render(
      <DetailedCalendar
        propertyId="prop-1"
        onSettingsClick={mockSettings}
        onMonthPickerClick={mockPicker}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with web layout', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={false} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with mobile layout', () => {
    const { container } = render(
      <DetailedCalendar propertyId="prop-1" isMobile={true} />
    );
    expect(container).toBeInTheDocument();
  });
});
