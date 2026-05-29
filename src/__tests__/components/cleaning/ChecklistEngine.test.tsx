import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChecklistBuilder from '@/components/cleaning/checklists/ChecklistBuilder';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key.includes('.') ? key : `builder.${key}`,
}));

describe('Checklist Engine (Story 29.4)', () => {
  test('renders ChecklistBuilder', () => {
    render(
      <ChecklistBuilder onSave={jest.fn()} onCancel={jest.fn()} />
    );
    expect(screen.getByPlaceholderText('builder.template_name')).toBeInTheDocument();
  });

  test('adds checklist items', () => {
    render(
      <ChecklistBuilder onSave={jest.fn()} onCancel={jest.fn()} />
    );

    const input = screen.getByPlaceholderText('builder.item_label') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Trocar roupa' } });
    expect((input as HTMLInputElement).value).toBe('Trocar roupa');
  });

  test('calls onSave with template', async () => {
    const onSave = jest.fn().mockResolvedValueOnce(undefined);
    render(
      <ChecklistBuilder onSave={onSave} onCancel={jest.fn()} />
    );

    const nameInput = screen.getByPlaceholderText('builder.template_name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Limpeza Standard' } });

    const itemInput = screen.getByPlaceholderText('builder.item_label') as HTMLInputElement;
    fireEvent.change(itemInput, { target: { value: 'Limpar piso' } });

    const addBtn = screen.getAllByRole('button')[0];
    fireEvent.click(addBtn);

    const saveBtn = screen.getByText('builder.save_template');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Limpeza Standard',
        })
      );
    });
  });
});
