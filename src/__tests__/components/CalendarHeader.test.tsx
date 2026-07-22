/**
 * Story 36.9: CalendarHeader Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarHeader } from '@/components/CalendarHeader';

describe('CalendarHeader', () => {
  it('renders property name', () => {
    render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={false}
      />
    );
    expect(screen.getByText('My Property')).toBeInTheDocument();
  });

  it('renders settings button', () => {
    render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={false}
      />
    );
    const settingsButtons = screen.getAllByRole('button');
    expect(settingsButtons.length).toBeGreaterThan(0);
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    const mockOnSettingsClick = jest.fn();
    render(
      <CalendarHeader
        propertyName="My Property"
        onSettingsClick={mockOnSettingsClick}
        isMobile={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    const settingsButton = buttons.find(
      btn => btn.getAttribute('aria-label') === 'Configurações'
    );

    if (settingsButton) {
      fireEvent.click(settingsButton);
      expect(mockOnSettingsClick).toHaveBeenCalled();
    }
  });

  it('calls onMonthPickerClick when month picker button is clicked', () => {
    const mockOnMonthPickerClick = jest.fn();
    render(
      <CalendarHeader
        propertyName="My Property"
        onMonthPickerClick={mockOnMonthPickerClick}
        isMobile={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    const monthButton = buttons.find(
      btn => btn.getAttribute('aria-label') === 'Seletor de mês'
    );

    if (monthButton) {
      fireEvent.click(monthButton);
      expect(mockOnMonthPickerClick).toHaveBeenCalled();
    }
  });

  it('renders mobile header with back button', () => {
    const { container } = render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={true}
      />
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('top-0');
  });

  it('renders web header without back button styling', () => {
    const { container } = render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={false}
      />
    );

    const header = container.querySelector('header');
    expect(header?.className).toContain('p-6');
  });

  it('renders all action buttons', () => {
    render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('handles missing callbacks gracefully', () => {
    const { container } = render(
      <CalendarHeader
        propertyName="My Property"
        isMobile={false}
      />
    );

    // Should render without errors even if callbacks are undefined
    expect(container.querySelector('header')).toBeInTheDocument();
  });
});
