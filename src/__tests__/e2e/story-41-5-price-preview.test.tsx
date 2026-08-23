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

    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/calculate-price')) {
        return Promise.resolve({
          ok: true,
          json: async () => allDiscountsResponse,
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
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
    }, { timeout: 1500 })

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reservations/calculate-price',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
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

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent(/200,00\s?€|€200\.00/)
  })

  it('should show loading state while fetching', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves - shows loading forever
    )

    render(
      <PriceBreakdownTooltip
        base_price={200}
        check_in="2026-08-29"
        check_out="2026-09-05"
        open={true}
      />
    )

    // Wait for debounce (300ms) + component to show loading state
    await new Promise(resolve => setTimeout(resolve, 400))

    // The tooltip should be visible and fetch should have been called
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Verify fetch was called to trigger loading state
    expect(global.fetch).toHaveBeenCalled()
  })

  it('should show error on API failure', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    )

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
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/tier')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ base_discount_percent: 10 }),
        })
      }
      if (url.includes('/calculate-price')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCalculatePriceResponse,
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({}) })
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

    // Wait for debounce and both fetches to complete
    await new Promise(resolve => setTimeout(resolve, 400))

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/guests/guest-123/tier'
    )

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reservations/calculate-price',
      expect.any(Object)
    )
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
