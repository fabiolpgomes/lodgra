import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskTable from '@/components/cleaning/TaskTable';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('TaskTable', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockTasks: any[] = [
    {
      id: '1',
      property_id: 'prop-1',
      scheduled_date: '2026-05-25',
      scheduled_time: '10:00',
      cleaner_id: null,
      status: 'pending',
      checklist_template_id: null,
      notes: null,
      completed_at: null,
      organization_id: 'org-1',
    },
  ];

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'cleaner-1', full_name: 'John Doe' },
        { id: 'cleaner-2', full_name: 'Jane Smith' },
      ],
    });
  });

  test('renders task table with columns', () => {
    render(
      <TaskTable
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('property')).toBeInTheDocument();
    expect(screen.getByText('date')).toBeInTheDocument();
    expect(screen.getByText('cleaner')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('actions')).toBeInTheDocument();
  });

  test('renders assign cleaner button', async () => {
    render(
      <TaskTable
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Atribuir Responsável')).toBeInTheDocument();
    });
  });

  test('opens cleaner dropdown on assign button click', async () => {
    render(
      <TaskTable
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const assignButton = await screen.findByText('Atribuir Responsável');
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('select_cleaner')).toBeInTheDocument();
    });
  });

  test('assigns cleaner and calls onUpdate', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTasks[0], cleaner_id: 'cleaner-1' }),
    });

    render(
      <TaskTable
        tasks={mockTasks}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    // Open dropdown
    const assignButton = await screen.findByText('Atribuir Responsável');
    fireEvent.click(assignButton);

    // Select cleaner from dropdown
    const selects = screen.getAllByRole('combobox');
    const cleanerSelect = selects[0] as HTMLSelectElement;
    fireEvent.change(cleanerSelect, { target: { value: 'cleaner-1' } });

    // Click assign/confirm button
    const confirmButton = await screen.findByText(/Atribuir|Confirmar/);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
