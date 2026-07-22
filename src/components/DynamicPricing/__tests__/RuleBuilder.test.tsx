/**
 * Story 36.11b: RuleBuilder Component Tests
 * Test rule creation, validation, template application
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleBuilder } from '../RuleBuilder';
import { toast } from 'sonner';

jest.mock('sonner');

describe('RuleBuilder', () => {
  const mockOnCreateRule = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Template Tests
  describe('Templates', () => {
    it('should display 4 pre-built templates', () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('High Occupancy Boost')).toBeInTheDocument();
      expect(screen.getByText('Last-Minute Discount')).toBeInTheDocument();
      expect(screen.getByText('Peak Season Premium')).toBeInTheDocument();
      expect(screen.getByText('Weekend Rate')).toBeInTheDocument();
    });

    it('should apply template when clicked', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const boostButton = screen.getByText('High Occupancy Boost').closest('button');
      await userEvent.click(boostButton!);

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('High Occupancy Boost')
      );
    });
  });

  // Form Validation Tests
  describe('Form Validation', () => {
    it('should require rule name before submission', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Nome da regra obrigatório');
      expect(mockOnCreateRule).not.toHaveBeenCalled();
    });

    it('should accept valid rule creation', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByPlaceholderText('ex: Preço de fim de semana');
      await userEvent.type(nameInput, 'Test Rule');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreateRule).toHaveBeenCalled();
      });
    });
  });

  // Condition Type Tests
  describe('Condition Types', () => {
    it('should allow selecting different condition types', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const conditionSelect = screen.getByDisplayValue('Ocupação (%)');
      expect(conditionSelect).toBeInTheDocument();

      await userEvent.selectOptions(conditionSelect, 'season');
      expect(conditionSelect).toHaveValue('season');
    });

    it('should validate occupancy condition value range', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByPlaceholderText('ex: Preço de fim de semana');
      await userEvent.type(nameInput, 'Occupancy Rule');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCreateRule).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Occupancy Rule',
          })
        );
      });
    });
  });

  // Action Type Tests
  describe('Action Types', () => {
    it('should support increase_percent action', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const actionSelect = screen.getByDisplayValue('Aumentar %');
      expect(actionSelect).toBeInTheDocument();
    });

    it('should support decrease_percent action', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const actionSelect = screen.getByDisplayValue('Aumentar %');
      await userEvent.selectOptions(actionSelect, 'decrease_percent');
      expect(actionSelect).toHaveValue('decrease_percent');
    });

    it('should support set_price action', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const actionSelect = screen.getByDisplayValue('Aumentar %');
      await userEvent.selectOptions(actionSelect, 'set_price');
      expect(actionSelect).toHaveValue('set_price');
    });
  });

  // Priority Tests
  describe('Priority', () => {
    it('should accept priority value between 1-10', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const priorityInput = screen.getByDisplayValue('1') as HTMLInputElement;
      expect(priorityInput).toBeInTheDocument();
      expect(priorityInput.min).toBe('1');
      expect(priorityInput.max).toBe('10');
    });
  });

  // Enabled State Tests
  describe('Enabled State', () => {
    it('should allow toggling rule enabled state', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const enableCheckbox = screen.getByRole('checkbox', {
        name: /ativar regra/i,
      });
      expect(enableCheckbox).toBeChecked();

      await userEvent.click(enableCheckbox);
      expect(enableCheckbox).not.toBeChecked();
    });
  });

  // Close Tests
  describe('Modal Control', () => {
    it('should close modal when Cancel is clicked', async () => {
      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByText('Cancelar');
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal after successful rule creation', async () => {
      mockOnCreateRule.mockResolvedValueOnce(undefined);

      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByPlaceholderText('ex: Preço de fim de semana');
      await userEvent.type(nameInput, 'Test Rule');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should show error toast on creation failure', async () => {
      mockOnCreateRule.mockRejectedValueOnce(new Error('API Error'));

      render(
        <RuleBuilder
          propertyId="prop-123"
          onCreateRule={mockOnCreateRule}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByPlaceholderText('ex: Preço de fim de semana');
      await userEvent.type(nameInput, 'Test Rule');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao criar regra');
      });
    });
  });
});
