import { render, screen } from '@testing-library/react'
import { PriceRecommendationCard } from '@/components/pricing/PriceRecommendationCard'
import type { PriceRecommendation } from '@/types/pricing.types'
import type { CurrencyCode } from '@/lib/utils/currency'

describe('PriceRecommendationCard', () => {
  const recommendation: PriceRecommendation = {
    id: 'rec-1',
    property_id: 'prop-1',
    recommended_price: 120,
    confidence: 0.76,
    reason: 'Market demand is growing steadily.',
    market_analysis: {
      median_price: 115,
      market_trend: 'stable',
      competitor_avg: 118,
      sample_size: 8,
    },
    revenue_projection: {
      current_monthly: 1500,
      projected_monthly: 1800,
      difference: 300,
      percentage_change: 20,
    },
    accepted: false,
    created_at: '2026-08-23T00:00:00.000Z',
    updated_at: '2026-08-23T00:00:00.000Z',
  }

  it('normalizes the currency before formatting recommendation values', () => {
    render(
      <PriceRecommendationCard
        recommendation={recommendation}
        currentPrice={100}
        currency={'brl' as unknown as CurrencyCode}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    )

    expect(screen.getByText(/R\$\s*120,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*100,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*1\.800,00|R\$\s*1800,00/)).toBeInTheDocument()
  })
})
