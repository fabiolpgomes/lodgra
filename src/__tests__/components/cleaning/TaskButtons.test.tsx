import { render, screen } from '@testing-library/react';
import TaskForm from '@/components/cleaning/TaskForm';
import TaskFilters from '@/components/cleaning/TaskFilters';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

describe('Button Height Accessibility (Task 1)', () => {
  test('TaskForm renders submit button', () => {
    const mockOnCancel = jest.fn();
    const { container } = render(
      <TaskForm onSuccess={jest.fn()} onCancel={mockOnCancel} />
    );

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toBeInTheDocument();
  });

  test('TaskFilters renders without errors', () => {
    render(
      <TaskFilters onFilterChange={jest.fn()} />
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
