import { render, screen } from '@testing-library/react'
import { PropertyCard } from '@/components/common/public/properties/PropertyCard'

describe('PropertyCard', () => {
  it('formats the nightly price with the provided currency', () => {
    render(
      <PropertyCard
        id="prop-1"
        slug="vista-mar"
        name="Vista Mar"
        city="Faro"
        country="Portugal"
        image=""
        price={125}
        currency="brl"
        bedrooms={2}
        bathrooms={1}
        maxGuests={4}
      />
    )

    expect(screen.getAllByText(/R\$\s*125,00/).length).toBeGreaterThan(0)
  })
})
