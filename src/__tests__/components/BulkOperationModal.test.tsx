/**
 * Story 36.5: Bulk Operation Modal Tests
 * Unit tests for bulk operation confirmation dialog
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkOperationModal } from '@/components/PricingCalendar/BulkOperationModal';
import { BulkOperationConfig } from '@/hooks/useBulkPricingOperation';

describe('BulkOperationModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const mockConfig: BulkOperationConfig = {
    operationType: 'price',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-07-05'),
    price: 150,
    propertyId: 'prop-123',
    currentPrices: new Map([
      ['2026-07-01', { date: '2026-07-01', price: 100, property_id: 'prop-123' }],
      ['2026-07-02', { date: '2026-07-02', price: 100, property_id: 'prop-123' }],
    ]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BulkOperationModal
        isOpen={false}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(container.firstChild).toBeEmptyDOMNode();
  });

  it('renders confirmation dialog when isOpen is true', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Confirm Set Price/i)).toBeInTheDocument();
  });

  it('displays date range information', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Jul 01/i)).toBeInTheDocument();
    expect(screen.getByText(/Jul 05/i)).toBeInTheDocument();
  });

  it('displays affected date count', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/5 dates/i)).toBeInTheDocument();
  });

  it('displays price for price operation', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('$150.00')).toBeInTheDocument();
  });

  it('displays discount for discount operation', () => {
    const discountConfig: BulkOperationConfig = {
      ...mockConfig,
      operationType: 'discount',
      discountPercent: 10,
    };

    render(
      <BulkOperationModal
        isOpen={true}
        config={discountConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/10% off/i)).toBeInTheDocument();
  });

  it('shows warning for large operations (>30 dates)', () => {
    const largeConfig: BulkOperationConfig = {
      ...mockConfig,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-08-01'),
    };

    render(
      <BulkOperationModal
        isOpen={true}
        config={largeConfig}
        currentPrices={new Map()}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Large Operation/i)).toBeInTheDocument();
  });

  it('shows delete warning for delete operation', () => {
    const deleteConfig: BulkOperationConfig = {
      ...mockConfig,
      operationType: 'delete',
    };

    render(
      <BulkOperationModal
        isOpen={true}
        config={deleteConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button clicked', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables buttons when loading', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /Applying/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('displays price preview for non-delete operations', () => {
    render(
      <BulkOperationModal
        isOpen={true}
        config={mockConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/Price Preview/i)).toBeInTheDocument();
  });

  it('does not display price preview for delete operations', () => {
    const deleteConfig: BulkOperationConfig = {
      ...mockConfig,
      operationType: 'delete',
    };

    render(
      <BulkOperationModal
        isOpen={true}
        config={deleteConfig}
        currentPrices={mockConfig.currentPrices}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText(/Price Preview/i)).not.toBeInTheDocument();
  });
});
