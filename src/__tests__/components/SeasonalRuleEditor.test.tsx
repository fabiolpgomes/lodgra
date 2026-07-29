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
    const mockSave = vi.fn();
    const { container } = render(
      <SeasonalRuleEditor
        isOpen={false}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    expect(container.querySelector('.fixed')).not.toBeInTheDocument();
  });

  it('should render modal when open (create mode)', () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByText(/Create Seasonal Rule/)).toBeInTheDocument();
  });

  it('should render modal when open (edit mode)', () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByText(/Edit Seasonal Rule/)).toBeInTheDocument();
  });

  it('should populate fields from existing rule', () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    expect(screen.getByDisplayValue(/Summer Peak/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2026-06-01/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/2026-08-31/)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/150/)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Rule name is required/)).toBeInTheDocument();
    });
  });

  it('should validate date range', async () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Rule name/);
    const startDateInput = screen.getAllByDisplayValue(/(2026-|No value)/)[0];
    const endDateInput = screen.getAllByDisplayValue(/(2026-|No value)/)[1];
    const priceInput = screen.getByPlaceholderText(/0.00/);

    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });
    fireEvent.change(startDateInput, { target: { value: '2026-08-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(priceInput, { target: { value: '100' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/End date must be after or equal to start date/)).toBeInTheDocument();
    });
  });

  it('should validate positive price', async () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Rule name/);
    const startDateInput = screen.getAllByRole('textbox').find(el => el.getAttribute('type') === 'date');
    const priceInput = screen.getByPlaceholderText(/0.00/);

    fireEvent.change(nameInput, { target: { value: 'Test Rule' } });
    fireEvent.change(startDateInput!, { target: { value: '2026-06-01' } });
    fireEvent.change(priceInput, { target: { value: '-50' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/positive number/)).toBeInTheDocument();
    });
  });

  it('should call onSave with correct values', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Rule name/);
    const dateInputs = screen.getAllByRole('textbox').filter(el => el.getAttribute('type') === 'date');
    const priceInput = screen.getByPlaceholderText(/0.00/);

    fireEvent.change(nameInput, { target: { value: 'Winter Discount' } });
    fireEvent.change(dateInputs[0], { target: { value: '2026-12-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2027-02-28' } });
    fireEvent.change(priceInput, { target: { value: '80' } });

    const saveButton = screen.getByText(/Save/);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        'Winter Discount',
        '2026-12-01',
        '2027-02-28',
        80,
        true
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('should close modal on cancel', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const cancelButton = screen.getByText(/Cancel/);
    fireEvent.click(cancelButton);

    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle active toggle', () => {
    const mockSave = vi.fn();
    render(
      <SeasonalRuleEditor
        rule={mockRule}
        isOpen={true}
        onClose={vi.fn()}
        onSave={mockSave}
      />
    );

    const activeCheckbox = screen.getByRole('checkbox');
    expect(activeCheckbox).toBeChecked();

    fireEvent.click(activeCheckbox);
    expect(activeCheckbox).not.toBeChecked();
  });

  it('should close on backdrop click', () => {
    const mockSave = vi.fn();
    const mockClose = vi.fn();

    render(
      <SeasonalRuleEditor
        isOpen={true}
        onClose={mockClose}
        onSave={mockSave}
      />
    );

    const backdrop = screen.getByRole('dialog', { hidden: true })?.previousElementSibling;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockClose).toHaveBeenCalled();
    }
  });
});
