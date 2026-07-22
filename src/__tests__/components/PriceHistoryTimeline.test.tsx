/**
 * Story 36.7: Price History Timeline Component Tests
 * Test rendering and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceHistoryTimeline } from '@/components/PricingAnalytics/PriceHistoryTimeline';
import { PriceHistory } from '@/types/pricing.types';

describe.skip('PriceHistoryTimeline', () => {
  const mockHistory: PriceHistory[] = [
    {
      id: '1',
      property_id: 'prop-1',
      price: 150,
      date_applied: '2024-01-10',
      changed_by: 'user-1',
      change_reason: 'Seasonal adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      property_id: 'prop-1',
      price: 130,
      date_applied: '2024-01-08',
      changed_by: 'user-1',
      change_reason: 'Manual adjustment',
      is_revert: false,
      is_deleted: false,
      created_at: '2024-01-08T10:00:00Z',
      updated_at: '2024-01-08T10:00:00Z',
    },
  ];

  it('should render history timeline', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<PriceHistoryTimeline history={[]} loading={true} />);

    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('should show empty state', () => {
    render(<PriceHistoryTimeline history={[]} />);

    expect(screen.getByText('No price history available')).toBeInTheDocument();
  });

  it('should expand/collapse details on click', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    const card = screen.getAllByRole('heading', { level: 2 })[0];
    fireEvent.click(card);

    expect(screen.getByText('Seasonal adjustment')).toBeInTheDocument();
  });

  it('should show load more button when hasMore is true', () => {
    const onLoadMore = jest.fn();
    render(
      <PriceHistoryTimeline
        history={mockHistory}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );

    const loadMoreBtn = screen.getByText('Load More');
    fireEvent.click(loadMoreBtn);

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('should show price change indicators', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    // Price increased from 130 to 150
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('should mark reverted prices', () => {
    const withRevert = [
      { ...mockHistory[0], is_revert: true },
      ...mockHistory,
    ];

    render(<PriceHistoryTimeline history={withRevert} />);

    expect(screen.getByText('Reverted')).toBeInTheDocument();
  });

  it('should display percentage change', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    // Should show ~15.38% increase
    expect(screen.getByText(/15\./)).toBeInTheDocument();
  });

  it('should show active status for non-reverted records', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    const activeElements = screen.getAllByText('Active');
    expect(activeElements.length).toBeGreaterThan(0);
  });

  it('should handle single item timeline', () => {
    render(<PriceHistoryTimeline history={[mockHistory[0]]} />);

    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should display created timestamp in expanded view', () => {
    render(<PriceHistoryTimeline history={mockHistory} />);

    const card = screen.getAllByRole('heading', { level: 2 })[0];
    fireEvent.click(card);

    expect(screen.getByText(/2024-01-10/)).toBeInTheDocument();
  });
});
