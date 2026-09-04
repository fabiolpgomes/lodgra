/**
 * Story 36.6: Tests for SeasonalRuleEditor component
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeasonalRuleEditor } from '@/components/PricingCalendar/SeasonalRuleEditor';
import { SeasonalPricingRule } from '@/types/pricing.types';

describe('SeasonalRuleEditor Component', () => {
  const mockRule: SeasonalPricingRule = {
    id: 'rule-1',
    property_id: 'prop-1',
    name: 'Summer Peak',
    date_start: '2026-06-01',
    date_end: '2026-08-31',
    price_per_night: 150,
    is_active: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  };

  it('should not render when closed', () => {
    const mockSave = jest.fn();
    const { container } = render(
      <SeasonalRuleEditor
        isOpen={false}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    expect(container.querySelector('.fixed')).not.toBeInTheDocument();
  });

  it('should render modal when open (create mode)', () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByText(/Criar regra sazonal/)).toBeInTheDocument();
  });

  it('should render modal when open (edit mode)', () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByText(/Editar regra sazonal/)).toBeInTheDocument();
  });

  it('should display the provided currency in the price label', () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
        currency="USD"
      />
    );

    expect(screen.getByLabelText(/Preço por noite \(USD\)/)).toBeInTheDocument();
  });

  it('should populate fields from existing rule', () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByDisplayValue(/Summer Peak/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2026-08-31/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/150/)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/O nome da regra é obrigatório/)).toBeInTheDocument();
    });
  });

  it('should validate date range', async () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Alta temporada/);
    const startDateInput = screen.getByLabelText(/Data inicial/);
    const endDateInput = screen.getByLabelText(/Data final/);
    const priceInput = screen.getByPlaceholderText(/0,00/);

    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });
    fireEvent.change(startDateInput, { target: { value: '2026-08-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(priceInput, { target: { value: '100' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/A data final deve ser igual ou posterior à data inicial/)).toBeInTheDocument();
    });
  });

  it('should validate positive price', async () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Alta temporada/);
    const startDateInput = screen.getByLabelText(/Data inicial/);
    const endDateInput = screen.getByLabelText(/Data final/);
    const priceInput = screen.getByPlaceholderText(/0,00/);

    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });
    fireEvent.change(startDateInput, { target: { value: '2026-06-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-06-30' } });
    fireEvent.change(priceInput, { target: { value: '-50' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/O preço por noite deve ser um número válido/)).toBeInTheDocument();
    });
  });

  it('should call onSave with correct values', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const mockClose = jest.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Alta temporada/);
    const startDateInput = screen.getByLabelText(/Data inicial/);
    const endDateInput = screen.getByLabelText(/Data final/);
    const priceInput = screen.getByPlaceholderText(/0,00/);

    fireEvent.change(nameInput, { target: { value: 'Winter Discount' } });
    fireEvent.change(startDateInput, { target: { value: '2026-12-01' } });
    fireEvent.change(endDateInput, { target: { value: '2027-02-28' } });
    fireEvent.change(priceInput, { target: { value: '80' } });

    const saveButton = screen.getByText(/Guardar/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        'Winter Discount',
        '2026-12-01',
        '2027-02-28',
        80,
        1,
        true
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should close modal on cancel', () => {
    const mockSave = jest.fn();
    const mockClose = jest.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const cancelButton = screen.getByText(/Cancelar/);
    fireEvent.click(cancelButton);

    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle active toggle', () => {
    const mockSave = jest.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={jest.fn()}
        onSave={mockSave}
      />
    );

    const activeCheckbox = screen.getByRole('checkbox');
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('should close on backdrop click', () => {
    const mockSave = jest.fn();
    const mockClose = jest.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    // Find the backdrop div (the dark overlay)
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockClose).toHaveBeenCalled();
    }
  });
});
