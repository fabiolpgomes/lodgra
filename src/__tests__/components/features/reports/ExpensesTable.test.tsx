import { render, screen } from '@testing-library/react'
import { ExpensesTable } from '@/components/features/reports/ExpensesTable'

describe('ExpensesTable', () => {
  it('formats each row with its own currency and does not invent EUR when currency is missing', () => {
    render(
      <ExpensesTable
        expenses={[
          {
            id: 'expense-1',
            expense_date: '2026-08-01',
            description: 'Limpeza',
            category: 'cleaning',
            amount: 123.45,
            currency: null,
            notes: null,
            properties: null,
          },
          {
            id: 'expense-2',
            expense_date: '2026-08-02',
            description: 'Manutenção',
            category: 'maintenance',
            amount: 50,
            currency: 'brl',
            notes: null,
            properties: { name: 'Casa Azul', currency: 'BRL' },
          },
        ]}
        startDate="2026-08-01"
        endDate="2026-08-31"
      />
    )

    expect(screen.getAllByText('sem moeda').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/123,45/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/R\$\s*50,00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })
})
