/**
 * Story 36.3: Date Detail Modal Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DateDetailModal } from '@/components/PricingCalendar/DateDetailModal';

describe('DateDetailModal', () => {
  const mockDate = new Date('2026-07-15');

  const defaultProps = {
    isOpen: true,
    date: mockDate,
    currentPrice: undefined,
    basePrice: 100,
    weekendPrice: 150,
    isWeekend: false,
    onClose: jest.fn(),
    onSave: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<DateDetailModal {...defaultProps} />);

    expect(screen.getByText('quarta-feira, 15 de julho de 2026')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <DateDetailModal {...defaultProps} isOpen={false} date={null} />
    );

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeInTheDocument();
  });

  it('displays base price correctly', () => {
    render(<DateDetailModal {...defaultProps} />);

    expect(screen.getByText('Preço base')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('displays weekend price label for weekend dates', () => {
    render(
      <DateDetailModal
        {...defaultProps}
        isWeekend={true}
        weekendPrice={150}
      />
    );

    expect(screen.getByText('Preço de fim de semana')).toBeInTheDocument();
    expect(screen.getByText('150.00')).toBeInTheDocument();
  });

  it('shows delete button when override exists', () => {
    render(
      <DateDetailModal
        {...defaultProps}
        currentPrice={120}
      />
    );

    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument();
  });

  it('does not show delete button when no override exists', () => {
    render(
      <DateDetailModal
        {...defaultProps}
        currentPrice={undefined}
      />
    );

    const deleteButton = screen.queryByRole('button', { name: /eliminar/i });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();

    render(
      <DateDetailModal
        {...defaultProps}
        onClose={onClose}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('displays override price label', () => {
    render(<DateDetailModal {...defaultProps} />);

    expect(screen.getByText('Preço de exceção (opcional)')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<DateDetailModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('handles overlay click to close', () => {
    const onClose = jest.fn();

    const { container } = render(
      <DateDetailModal
        {...defaultProps}
        onClose={onClose}
      />
    );

    const overlay = container.querySelector('.fixed.inset-0.bg-black');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('shows modal header with date', () => {
    render(<DateDetailModal {...defaultProps} />);

    expect(screen.getByText('quarta-feira, 15 de julho de 2026')).toBeInTheDocument();
  });

  it('displays alternative text for weekend dates', () => {
    render(
      <DateDetailModal
        {...defaultProps}
        isWeekend={true}
        weekendPrice={150}
      />
    );

    // Should show weekend price instead of base price
    const priceText = screen.getByText('150.00');
    expect(priceText).toBeInTheDocument();
  });
});
