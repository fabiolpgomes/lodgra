/**
 * Story 36.11b: DryRunPreview Component Tests
 * Test dry-run simulation, price changes, revenue impact, apply/discard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DryRunPreview } from '../DryRunPreview';
import { toast } from 'sonner';

jest.mock('sonner');

describe('DryRunPreview', () => {
  const mockOnApply = jest.fn();
  const mockOnDiscard = jest.fn();

  const mockPriceChanges = [
    {
      date: '2026-07-22',
      currentPrice: 100,
      simulatedPrice: 110,
      change: 10,
      percentChange: 10,
    },
    {
      date: '2026-07-23',
      currentPrice: 100,
      simulatedPrice: 95,
      change: -5,
      percentChange: -5,
    },
    {
      date: '2026-07-24',
      currentPrice: 100,
      simulatedPrice: 100,
      change: 0,
      percentChange: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Summary Stats Tests
  describe('Summary Statistics', () => {
    it('should display total nights count', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument(); // 3 nights
    });

    it('should count price increases correctly', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const increaseSection = screen.getByText('Aumentos').closest('div');
      expect(increaseSection).toBeInTheDocument();
    });

    it('should count price decreases correctly', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const decreaseSection = screen.getByText('Reduções').closest('div');
      expect(decreaseSection).toBeInTheDocument();
    });

    it('should display total revenue impact', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText('€15.00')).toBeInTheDocument();
    });

    it('should display negative revenue impact', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={-10}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/€-?10\.00/)).toBeInTheDocument();
    });
  });

  // Price Change Table Tests
  describe('Price Changes Table', () => {
    it('should display price changes in table', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/22/)).toBeInTheDocument();
      expect(screen.getAllByText(/€100\.00/)[0]).toBeInTheDocument();
      expect(screen.getByText(/€110\.00/)).toBeInTheDocument();
    });

    it('should display percentage change correctly', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/\+10\.00.*10\.0%/)).toBeInTheDocument();
    });

    it('should show decrease with negative symbol', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/-5\.00.*-5\.0%/)).toBeInTheDocument();
    });

    it('should truncate table to first 15 rows', () => {
      const manyChanges = Array.from({ length: 30 }, (_, i) => ({
        date: `2026-07-${String(i + 1).padStart(2, '0')}`,
        currentPrice: 100,
        simulatedPrice: 100 + i,
        change: i,
        percentChange: i,
      }));

      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={manyChanges}
          totalRevenueDifference={100}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/Mostrando 15 de 30 dias/)).toBeInTheDocument();
    });
  });

  // Apply Button Tests
  describe('Apply Changes', () => {
    it('should call onApply when Apply button clicked', async () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const applyButton = screen.getByText('Aplicar Mudanças');
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalled();
      });
    });

    it('should show success toast on apply', async () => {
      mockOnApply.mockResolvedValueOnce(undefined);

      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const applyButton = screen.getByText('Aplicar Mudanças');
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Mudanças de preço aplicadas com sucesso'
        );
      });
    });

    it('should show error toast on apply failure', async () => {
      mockOnApply.mockRejectedValueOnce(new Error('API Error'));

      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const applyButton = screen.getByText('Aplicar Mudanças');
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao aplicar mudanças');
      });
    });

    it('should disable apply button while loading', async () => {
      mockOnApply.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const applyButton = screen.getByText('Aplicar Mudanças');
      await userEvent.click(applyButton);

      await waitFor(() => {
        expect(applyButton).toBeDisabled();
      });
    });
  });

  // Discard Button Tests
  describe('Discard Changes', () => {
    it('should call onDiscard when Discard button clicked', async () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      const discardButton = screen.getByText('Descartar Mudanças');
      await userEvent.click(discardButton);

      expect(mockOnDiscard).toHaveBeenCalled();
    });
  });

  // Warning Message Tests
  describe('Warning', () => {
    it('should display warning that no changes have been applied', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/Esta é uma prévia/)).toBeInTheDocument();
      expect(screen.getByText(/mudança de preço foi aplicada/)).toBeInTheDocument();
    });
  });

  // Empty State Tests
  describe('Empty State', () => {
    it('should handle empty price changes', () => {
      render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={[]}
          totalRevenueDifference={0}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText('Prévia de Mudanças de Preço')).toBeInTheDocument();
    });
  });

  // Loading State Tests
  describe('Loading State', () => {
    it('should show loading prop affects button text', async () => {
      mockOnApply.mockImplementationOnce(() => new Promise(() => {}));

      const { rerender } = render(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
          loading={false}
        />
      );

      const applyButton = screen.getByText('Aplicar Mudanças');
      await userEvent.click(applyButton);

      rerender(
        <DryRunPreview
          propertyId="prop-123"
          priceChanges={mockPriceChanges}
          totalRevenueDifference={15}
          onApply={mockOnApply}
          onDiscard={mockOnDiscard}
          loading={true}
        />
      );

      expect(screen.getByText('Aplicando...')).toBeInTheDocument();
    });
  });
});
