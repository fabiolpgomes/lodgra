import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceBreakdownTooltip } from '@/components/pricing/PriceBreakdownTooltip'

// Mock fetch
global.fetch = jest.fn()

describe('PriceBreakdownTooltip - Story 41.5', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockCalculatePriceResponse = {
    base_price: 200,
    loyalty_discount_amount: 20,
    loyalty_discount_percent: 10,
    last_minute_discount: { applied: false, amount: 0 },
    extended_stay_discount: { applied: true, amount: 10, percent: 5 },
    early_bird_discount: { applied: true, amount: 10, percent: 5 },
    seasonal_adjustment: { applied: false, amount: 0 },
    total_discounts_amount: 40,
    final_price: 160,
    discount_breakdown: 'Base: €200, Final: €160',
  }

  it('should render toggle button', () => {
    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
      />
    )

    expect(screen.getByLabelText('Show price breakdown')).toBeInTheDocument()
  })

  it('should open tooltip on button click', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
      />
    )

    const button = screen.getByLabelText('Show price breakdown')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /price breakdown/i })).toBeInTheDocument()
    })
  })

  it('should close tooltip on button click when open', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const button = screen.getByLabelText('Show price breakdown')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should display all discount types when applied', async () => {
    const allDiscountsResponse = {
      ...mockCalculatePriceResponse,
      loyalty_discount_amount: 30,
      loyalty_discount_percent: 15,
      last_minute_discount: { applied: true, amount: 15, percent: 10 },
      extended_stay_discount: { applied: true, amount: 10, percent: 5 },
      early_bird_discount: { applied: true, amount: 10, percent: 5 },
      seasonal_adjustment: { applied: true, amount: 5, percent: 5 },
      total_discounts_amount: 70,
      final_price: 130,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => allDiscountsResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Preço Base/)).toBeInTheDocument()
      expect(screen.getByText(/€200.00/)).toBeInTheDocument()
    })

    expect(screen.getByText(/Desconto Fidelidade/)).toBeInTheDocument()
    expect(screen.getByText(/Estadia Estendida/)).toBeInTheDocument()
    expect(screen.getByText(/Desconto Antecipado/)).toBeInTheDocument()
    expect(screen.getByText(/Last-Minute/)).toBeInTheDocument()
    expect(screen.getByText(/Ajuste Sazonal/)).toBeInTheDocument()
    expect(screen.getByText(/Preço Final/)).toBeInTheDocument()
    expect(screen.getByText(/€130.00/)).toBeInTheDocument()
  })

  it('should display base price without discounts', async () => {
    const noDiscountResponse = {
      base_price: 200,
      loyalty_discount_amount: 0,
      loyalty_discount_percent: 0,
      last_minute_discount: { applied: false, amount: 0 },
      extended_stay_discount: { applied: false, amount: 0 },
      early_bird_discount: { applied: false, amount: 0 },
      seasonal_adjustment: { applied: false, amount: 0 },
      total_discounts_amount: 0,
      final_price: 200,
      discount_breakdown: 'Base: €200',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => noDiscountResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Preço Final/)).toBeInTheDocument()
    })

    expect(screen.getByText(/€200.00/)).toBeInTheDocument()
  })

  it('should show loading state while fetching', () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    expect(screen.getByText(/Calculating price/i)).toBeInTheDocument()
  })

  it('should show error on API failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Unable to calculate price breakdown/i)).toBeInTheDocument()
    })
  })

  it('should close tooltip with Escape key', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should fetch guest tier when guest_id is provided', async () => {
    const tierResponse = { base_discount_percent: 10 }
    const calculateResponse = {
      ...mockCalculatePriceResponse,
      loyalty_discount_percent: 10,
      loyalty_discount_amount: 20,
    }

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => tierResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => calculateResponse,
      })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        guest_id="guest-123"
        open={true}
      />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/guests/guest-123/tier',
        expect.any(Object)
      )
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/reservations/calculate-price',
        expect.any(Object)
      )
    })
  })

  it('should have proper aria attributes', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
      />
    )

    const button = screen.getByLabelText('Show price breakdown')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')

    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('should include screen reader text', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    const { container } = render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    await waitFor(() => {
      const srOnly = container.querySelector('.sr-only')
      expect(srOnly).toBeInTheDocument()
      expect(srOnly).toHaveTextContent(/Price breakdown/)
    })
  })

  it('should handle invalid date range', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Invalid dates' }),
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-09-05"
        check_out="2026-08-29"
        open={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/Please select valid dates/i)).toBeInTheDocument()
    })
  })

  it('should call onOpenChange callback', async () => {
    const onOpenChange = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCalculatePriceResponse,
    })

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        onOpenChange={onOpenChange}
      />
    )

    const button = screen.getByLabelText('Show price breakdown')
    fireEvent.click(button)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  it('should have responsive tooltip width', () => {
    const { container } = render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    const tooltip = container.querySelector('[role="dialog"]')
    expect(tooltip).toHaveClass('max-w-[90vw]')
  })
})
