import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BookingWidgetDesktop } from '@/components/common/public/booking/BookingWidgetDesktop'
import { BookingWidgetMobile } from '@/components/common/public/booking/BookingWidgetMobile'

jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children, ...props }: any) => (
      <a href={typeof href === 'string' ? href : href?.pathname || '#'} {...props}>
        {children}
      </a>
    ),
  }
})

describe('Booking widgets minimum nights validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total: 200, breakdown: [] }),
    }) as unknown as typeof fetch
  })

  it('blocks desktop checkout when the selected stay is shorter than the minimum', async () => {
    render(
      <BookingWidgetDesktop
        propertyName="Casa Teste"
        basePrice={100}
        currency="EUR"
        slug="casa-teste"
        minNights={3}
        initialCheckIn="2026-08-10"
        initialCheckOut="2026-08-11"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /estadia mínima/i })).toBeDisabled()
    })

    expect(screen.queryByRole('link', { name: /reservar agora/i })).not.toBeInTheDocument()
  })

  it('blocks mobile checkout when the selected stay is shorter than the minimum', async () => {
    render(
      <BookingWidgetMobile
        propertyName="Casa Teste"
        basePrice={100}
        currency="EUR"
        slug="casa-teste"
        minNights={4}
        initialCheckIn="2026-08-10"
        initialCheckOut="2026-08-12"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /estadia mínima/i })).toBeDisabled()
    })

    expect(screen.queryByRole('link', { name: /reservar agora/i })).not.toBeInTheDocument()
  })

  it('allows checkout when the stay meets the minimum nights', async () => {
    render(
      <BookingWidgetDesktop
        propertyName="Casa Teste"
        basePrice={100}
        currency="EUR"
        slug="casa-teste"
        minNights={2}
        initialCheckIn="2026-08-10"
        initialCheckOut="2026-08-12"
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /reservar agora/i })).toBeInTheDocument()
    })
  })
})
