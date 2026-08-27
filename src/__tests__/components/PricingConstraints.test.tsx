/**
 * Story 36.6: Tests for PricingConstraints component
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PricingConstraints } from '@/components/PricingCalendar/PricingConstraints';
import { PropertyPricingConstraints } from '@/types/pricing.types';

describe('PricingConstraints Component', () => {
  const mockConstraints: PropertyPricingConstraints = {
    property_id: 'prop-1',
    min_nightly_price: 50,
    max_nightly_price: 200,
  };

  it('should render input fields', () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    expect(screen.getByLabelText(/Preço mínimo por noite/)).toHaveValue(50);
    expect(screen.getByLabelText(/Preço máximo por noite/)).toHaveValue(200);
  });

  it('should display the provided currency in labels', () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
        currency="BRL"
      />
    );

    expect(screen.getByLabelText(/Preço mínimo por noite \(BRL\)/)).toHaveValue(50);
    expect(screen.getByLabelText(/Preço máximo por noite \(BRL\)/)).toHaveValue(200);
  });

  it('should handle null constraints', () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={null}
        onUpdate={mockUpdate}
      />
    );

    expect(screen.getByLabelText(/Preço mínimo por noite/)).toHaveValue(null);
    expect(screen.getByLabelText(/Preço máximo por noite/)).toHaveValue(null);
  });

  it('should validate min > max', async () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Preço mínimo por noite/);
    const maxInput = screen.getByLabelText(/Preço máximo por noite/);

    fireEvent.change(minInput, { target: { value: '300' } });
    fireEvent.change(maxInput, { target: { value: '100' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/O preço mínimo não pode exceder o preço máximo/i)).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should reject negative prices', async () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Preço mínimo por noite/);
    fireEvent.change(minInput, { target: { value: '-50' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/não pode ser negativo/i)).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should call onUpdate with correct values', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Preço mínimo por noite/);
    const maxInput = screen.getByLabelText(/Preço máximo por noite/);

    fireEvent.change(minInput, { target: { value: '75' } });
    fireEvent.change(maxInput, { target: { value: '250' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(75, 250);
    });
  });

  it('should allow empty values (no min/max)', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Preço mínimo por noite/);
    const maxInput = screen.getByLabelText(/Preço máximo por noite/);

    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(null, null);
    });
  });

  it('should show success message after update', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Restrições de preço atualizadas com sucesso/)).toBeInTheDocument();
    });
  });

  it('should reset to original values', () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Preço mínimo por noite/) as HTMLInputElement;
    const maxInput = screen.getByLabelText(/Preço máximo por noite/) as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '300' } });

    expect(minInput.value).toBe('100');
    expect(maxInput.value).toBe('300');

    const resetButton = screen.getByText(/Repor/);
    fireEvent.click(resetButton);

    expect(minInput.value).toBe('50');
    expect(maxInput.value).toBe('200');
  });

  it('should disable inputs while loading', () => {
    const mockUpdate = jest.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
        isLoading={true}
      />
    );

    expect(screen.getByLabelText(/Preço mínimo por noite/)).toBeDisabled();
    expect(screen.getByLabelText(/Preço máximo por noite/)).toBeDisabled();
    expect(screen.getByText(/Guardar/)).toBeDisabled();
    expect(screen.getByText(/Repor/)).toBeDisabled();
  });
});
