import { render, screen } from '@testing-library/react'
import { PriceStatisticsComponent } from '@/components/PricingAnalytics/PriceStatistics'
import type { PriceStatistics } from '@/types/pricing.types'
import type { CurrencyCode } from '@/lib/utils/currency'

describe('PriceStatisticsComponent', () => {
  const stats: PriceStatistics = {
    minPrice: 85,
    maxPrice: 145,
    avgPrice: 112.5,
    changeCount: 7,
    stdDeviation: 9.25,
  }

  it('normalizes the currency before formatting stats', () => {
    render(
      <PriceStatisticsComponent
        stats={stats}
        currency={'brl' as unknown as CurrencyCode}
      />
    )

    expect(screen.getByText(/R\$\s*85,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*145,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*112,50/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*9,25/)).toBeInTheDocument()
  })
})
