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
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    expect(screen.getByLabelText(/Minimum Nightly Price/)).toHaveValue(50);
    expect(screen.getByLabelText(/Maximum Nightly Price/)).toHaveValue(200);
  });

  it('should handle null constraints', () => {
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={null}
        onUpdate={mockUpdate}
      />
    );

    expect(screen.getByLabelText(/Minimum Nightly Price/)).toHaveValue(null);
    expect(screen.getByLabelText(/Maximum Nightly Price/)).toHaveValue(null);
  });

  it('should validate min > max', async () => {
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Nightly Price/);
    const maxInput = screen.getByLabelText(/Maximum Nightly Price/);

    fireEvent.change(minInput, { target: { value: '300' } });
    fireEvent.change(maxInput, { target: { value: '100' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Minimum price cannot exceed maximum price/i)).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should reject negative prices', async () => {
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Nightly Price/);
    fireEvent.change(minInput, { target: { value: '-50' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/cannot be negative/i)).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should call onUpdate with correct values', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Nightly Price/);
    const maxInput = screen.getByLabelText(/Maximum Nightly Price/);

    fireEvent.change(minInput, { target: { value: '75' } });
    fireEvent.change(maxInput, { target: { value: '250' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(75, 250);
    });
  });

  it('should allow empty values (no min/max)', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Nightly Price/);
    const maxInput = screen.getByLabelText(/Maximum Nightly Price/);

    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.change(maxInput, { target: { value: '' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(null, null);
    });
  });

  it('should show success message after update', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Pricing constraints updated successfully/)).toBeInTheDocument();
    });
  });

  it('should reset to original values', () => {
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
      />
    );

    const minInput = screen.getByLabelText(/Minimum Nightly Price/) as HTMLInputElement;
    const maxInput = screen.getByLabelText(/Maximum Nightly Price/) as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.change(maxInput, { target: { value: '300' } });

    expect(minInput.value).toBe('100');
    expect(maxInput.value).toBe('300');

    const resetButton = screen.getByText(/Reset/);
    fireEvent.click(resetButton);

    expect(minInput.value).toBe('50');
    expect(maxInput.value).toBe('200');
  });

  it('should disable inputs while loading', () => {
    const mockUpdate = vi.fn();
    render(
      <PricingConstraints
        constraints={mockConstraints}
        onUpdate={mockUpdate}
        isLoading={true}
      />
    );

    expect(screen.getByLabelText(/Minimum Nightly Price/)).toBeDisabled();
    expect(screen.getByLabelText(/Maximum Nightly Price/)).toBeDisabled();
    expect(screen.getByText(/Save/)).toBeDisabled();
    expect(screen.getByText(/Reset/)).toBeDisabled();
  });
});
