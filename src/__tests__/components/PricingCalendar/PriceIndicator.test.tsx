import { render, screen } from '@testing-library/react'
import { PriceIndicator } from '@/components/PricingCalendar/PriceIndicator'

describe('PriceIndicator', () => {
  it('formats the price using the provided currency', () => {
    render(<PriceIndicator priceType="base" price={1234.5} currency="BRL" />)

    expect(screen.getByText(/R\$/)).toBeInTheDocument()
    expect(screen.getByText(/1234|1\.234/)).toBeInTheDocument()
  })

  it('renders nothing when price is missing', () => {
    const { container } = render(<PriceIndicator priceType="base" />)

    expect(container).toBeEmptyDOMElement()
  })
})
