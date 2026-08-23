import { render, screen } from '@testing-library/react'
import { RevenueTable } from '@/components/features/reports/RevenueTable'

describe('RevenueTable', () => {
  it('formats reservations without inventing EUR when currency is missing', () => {
    render(
      <RevenueTable
        reservations={[
          {
            id: 'res-1',
            check_in: '2026-08-01',
            check_out: '2026-08-03',
            total_amount: 200,
            currency: null,
            status: 'confirmed',
            guests: { first_name: 'Ana', last_name: 'Silva' },
            property_listings: {
              properties: {
                name: 'Casa Azul',
                city: 'Faro',
                currency: null,
              },
            },
          },
          {
            id: 'res-2',
            check_in: '2026-08-04',
            check_out: '2026-08-06',
            total_amount: 300,
            currency: 'brl',
            status: 'confirmed',
            guests: { first_name: 'João', last_name: 'Costa' },
            property_listings: {
              properties: {
                name: 'Casa Azul',
                city: 'Faro',
                currency: 'BRL',
              },
            },
          },
        ]}
        startDate="2026-08-01"
        endDate="2026-08-31"
      />
    )

    expect(screen.getAllByText(/200,00/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/R\$\s*300,00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
  })
})
