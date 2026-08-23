import { render, screen } from '@testing-library/react'
import { MonthlyComparison } from '@/components/features/reports/MonthlyComparison'

describe('MonthlyComparison', () => {
  it('formats rows without inventing EUR when currency is missing', () => {
    render(
      <MonthlyComparison
        monthlyStats={[
          {
            monthKey: '2026-08',
            month: 'Agosto',
            currency: null as unknown as string,
            revenue: 123.45,
            reservations: 3,
            nights: 2,
            availableNights: 4,
          },
          {
            monthKey: '2026-09',
            month: 'Setembro',
            currency: 'brl',
            revenue: 50,
            reservations: 1,
            nights: 1,
            availableNights: 2,
          },
        ]}
      />
    )

    expect(screen.getAllByText(/123,45/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/R\$\s*50,00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })
})
