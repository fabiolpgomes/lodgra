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
  test('TaskForm submit button has size="lg" for accessibility', () => {
    const mockOnCancel = jest.fn();
    const { container } = render(
      <TaskForm onSuccess={jest.fn()} onCancel={mockOnCancel} />
    );

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton).toHaveClass('h-10');
  });

  test('TaskFilters reset button has size="lg" for accessibility', () => {
    const { container } = render(
      <TaskFilters onFilterChange={jest.fn()} />
    );

    const resetButtons = container.querySelectorAll('button[variant="outline"]');
    const resetButton = Array.from(resetButtons).find((btn) =>
      btn.textContent?.includes('reset')
    );

    expect(resetButton).toHaveClass('h-10');
  });
});
