import React from 'react'
import { render, screen } from '@testing-library/react'
import { BookingSummary } from '@/components/common/public/BookingSummary'

describe('BookingSummary cancellation policy', () => {
  it('shows the cancellation policy in the full summary', () => {
    render(
      <BookingSummary
        propertyName="Casa do Mar"
        city="Faro"
        checkin="2026-08-10"
        checkout="2026-08-13"
        guests={2}
        totalPrice={300}
        cancellationPolicy={{
          policy_type: 'flexible',
          full_refund_days: 5,
          partial_refund_days: 1,
          partial_refund_percent: 50,
        }}
      />
    )

    expect(screen.getByText(/Política/i)).toBeInTheDocument()
    expect(screen.getByText(/Flexível/)).toBeInTheDocument()
    expect(screen.getByText(/reembolso integral até 5 dias antes do check-in/)).toBeInTheDocument()
  })

  it('shows the cancellation policy in the compact summary too', () => {
    render(
      <BookingSummary
        propertyName="Casa do Mar"
        checkin="2026-08-10"
        checkout="2026-08-13"
        guests={2}
        totalPrice={300}
        compact
        cancellationPolicy={{
          policy_type: 'firm',
          full_refund_days: 30,
        }}
      />
    )

    expect(screen.getByText(/Firme/)).toBeInTheDocument()
    expect(screen.getByText(/30 dias antes do check-in/)).toBeInTheDocument()
  })
})
