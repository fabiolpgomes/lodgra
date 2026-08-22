import { POST } from '../route'

jest.mock('@/lib/pricing/property-price-calculator', () => ({
  calculatePropertyPrice: jest.fn(),
}))

import { calculatePropertyPrice } from '@/lib/pricing/property-price-calculator'

describe('POST /api/properties/[id]/calculate-price', () => {
  it('returns the pricing breakdown for a property', async () => {
    ;(calculatePropertyPrice as jest.Mock).mockResolvedValue({
      baseTotal: 1000,
      discountApplied: true,
      discountType: 'weekly',
      discountPercentage: 10,
      discountAmount: 100,
      finalTotal: 900,
      breakdown: [
        { date: '2026-07-01', price: 100 },
      ],
    })

    const request = new Request('http://localhost:3000/api/properties/prop-123/calculate-price', {
      method: 'POST',
      body: JSON.stringify({
        checkInDate: '2026-07-01',
        checkOutDate: '2026-07-11',
      }),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: 'prop-123' }),
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.finalTotal).toBe(900)
    expect(data.discountType).toBe('weekly')
    expect(calculatePropertyPrice).toHaveBeenCalledWith(
      'prop-123',
      '2026-07-01',
      '2026-07-11'
    )
  })

  it('returns 400 when dates are missing', async () => {
    const request = new Request('http://localhost:3000/api/properties/prop-123/calculate-price', {
      method: 'POST',
      body: JSON.stringify({ checkInDate: '2026-07-01' }),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: 'prop-123' }),
    })

    expect(response.status).toBe(400)
  })
})
