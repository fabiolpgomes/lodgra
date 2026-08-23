import { render, screen } from '@testing-library/react'
import { PerformanceKPIs } from '@/components/features/reports/PerformanceKPIs'

describe('PerformanceKPIs', () => {
  it('formats KPI values using the provided currency', () => {
    render(
      <PerformanceKPIs
        metrics={{
          occupancyRate: 75,
          adr: 95.5,
          revenue: 2870,
          reservationCount: 12,
        }}
        reservations={[
          { id: 'res-1', total_amount: 420, currency: 'brl' },
          { id: 'res-2', total_amount: 180, currency: 'brl' },
        ]}
        _startDate="2026-08-01"
        _endDate="2026-08-31"
        currency={'brl' as any}
      />
    )

    expect(screen.getByText(/R\$\s*95,50/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*2\.870,00|R\$\s*2870,00/)).toBeInTheDocument()
    expect(screen.getByText(/BRL/)).toBeInTheDocument()
  })
})
