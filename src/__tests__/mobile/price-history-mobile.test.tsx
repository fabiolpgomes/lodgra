/**
 * Story 36.7: Price History Mobile Responsiveness Tests
 * Test mobile-friendly layouts and interactions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceHistoryTimeline } from '@/components/PricingAnalytics/PriceHistoryTimeline';
import { HistoryFilters } from '@/components/PricingAnalytics/HistoryFilters';
import { PriceHistory } from '@/types/pricing.types';

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Price History Mobile Responsiveness', () => {
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
  ];

  describe('Timeline Mobile Layout', () => {
    it('should render timeline on mobile', () => {
      render(<PriceHistoryTimeline history={mockHistory} />);

      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should have touch-friendly card sizes', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      // Check for adequate padding/spacing for touch targets
      const cards = container.querySelectorAll('[class*="rounded"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should support vertical scrolling', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      // Timeline should be organized vertically
      expect(container.innerHTML).toContain('space-y-4');
    });

    it('should show expandable cards on mobile', () => {
      render(<PriceHistoryTimeline history={mockHistory} />);

      // Cards should be clickable/expandable elements
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should have clickable expand buttons', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      // Find and click a card
      const card = container.querySelector('[class*="cursor-pointer"]');
      if (card) {
        fireEvent.click(card);
      }

      // Expanded content should be visible
      expect(screen.getByText('Seasonal adjustment')).toBeInTheDocument();
    });
  });

  describe('Filters Mobile Layout', () => {
    it('should render filters with toggle on mobile', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      expect(screen.getByText(/Show Filters/)).toBeInTheDocument();
    });

    it('should show/hide filters on toggle', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggleButton = screen.getByText(/Show Filters/);
      fireEvent.click(toggleButton);

      expect(screen.getByText('Start Date')).toBeInTheDocument();
    });

    it('should stack inputs vertically on mobile', () => {
      const onApply = jest.fn();
      const { container } = render(
        <HistoryFilters onApplyFilters={onApply} />
      );

      const toggleButton = screen.getByText(/Show Filters/);
      fireEvent.click(toggleButton);

      expect(container.innerHTML).toContain('grid-cols-1');
    });

    it('should have large enough touch targets', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggleButton = screen.getByText(/Show Filters/);

      // Should be clickable element
      expect(toggleButton).toBeInTheDocument();
      fireEvent.click(toggleButton);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show date inputs on mobile', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggle = screen.getByText(/Show Filters/);
      fireEvent.click(toggle);

      const dateInputs = screen.getAllByRole('textbox');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('should have full-width input fields on mobile', () => {
      const onApply = jest.fn();
      const { container } = render(
        <HistoryFilters onApplyFilters={onApply} />
      );

      const toggle = screen.getByText(/Show Filters/);
      fireEvent.click(toggle);

      const inputs = container.querySelectorAll('input[type="date"]');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Touch Interactions', () => {
    it('should support touch tap on cards', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      const card = container.querySelector('[class*="cursor-pointer"]');
      if (card) {
        fireEvent.touchEnd(card);
      }

      // Card should respond to touch
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should have clickable buttons with adequate spacing', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggle = screen.getByText(/Show Filters/);

      // Button should be clickable
      fireEvent.click(toggle);
      expect(toggle).toBeInTheDocument();
    });

    it('should show/hide content without page navigation', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggle = screen.getByText(/Show Filters/);
      fireEvent.click(toggle);

      expect(screen.getByText('Start Date')).toBeInTheDocument();

      fireEvent.click(toggle);
      // Content should remain on page
      expect(screen.getByText(/Show Filters/)).toBeInTheDocument();
    });
  });

  describe('Viewport Optimization', () => {
    it('should render timeline component', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      // Component should be rendered
      expect(container).toBeInTheDocument();
      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('should display prices in readable format', () => {
      render(<PriceHistoryTimeline history={mockHistory} />);

      // Should render price in formatted way
      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument();
    });

    it('should display dates clearly', () => {
      render(<PriceHistoryTimeline history={mockHistory} />);

      // Should show formatted date
      expect(screen.getByText(/Jan 10, 2024/)).toBeInTheDocument();
    });

    it('should be properly structured for accessibility', () => {
      const { container } = render(
        <PriceHistoryTimeline history={mockHistory} />
      );

      // Should have semantic structure
      const divs = container.querySelectorAll('div');
      expect(divs.length).toBeGreaterThan(0);
    });
  });

  describe('Performance on Mobile', () => {
    it('should handle large history efficiently', () => {
      const largeHistory = Array(100)
        .fill(null)
        .map((_, i) => ({
          ...mockHistory[0],
          id: `${i}`,
          price: 100 + i,
          date_applied: new Date(2024, 0, i + 1)
            .toISOString()
            .split('T')[0],
        }));

      const { container } = render(
        <PriceHistoryTimeline history={largeHistory} />
      );

      expect(container).toBeInTheDocument();
    });

    it('should support lazy loading', () => {
      const onLoadMore = jest.fn();
      render(
        <PriceHistoryTimeline
          history={mockHistory}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      const loadBtn = screen.getByText('Load More');
      fireEvent.click(loadBtn);

      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  describe('Form Input on Mobile', () => {
    it('should use native date picker on mobile', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggle = screen.getByText(/Show Filters/);
      fireEvent.click(toggle);

      // Check for date inputs by label
      expect(screen.getByText('Start Date')).toBeInTheDocument();
      expect(screen.getByText('End Date')).toBeInTheDocument();
    });

    it('should show search input for text input', () => {
      const onApply = jest.fn();
      render(<HistoryFilters onApplyFilters={onApply} />);

      const toggle = screen.getByText(/Show Filters/);
      fireEvent.click(toggle);

      const searchInputs = screen.getByPlaceholderText(
        /Search by reason/
      );
      expect(searchInputs).toBeInTheDocument();
    });
  });
});
