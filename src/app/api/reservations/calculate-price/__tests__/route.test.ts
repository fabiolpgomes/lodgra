import { POST } from '../route'

describe('POST /api/reservations/calculate-price', () => {
  describe('Valid requests', () => {
    it('should calculate simple price', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-15',
          checkOut: '2026-08-20',
          basePrice: 100,
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nights).toBe(5)
      expect(data.pricePerNight).toBe(100)
      expect(data.finalPrice).toBe(500)
      expect(data.breakdown).toBeDefined()
    })

    it('should apply weekly discount', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-15',
          checkOut: '2026-08-22',
          basePrice: 100,
          weeklyDiscountPercent: 10,
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nights).toBe(7)
      expect(data.volumeDiscountType).toBe('weekly')
      expect(data.volumeDiscountPercent).toBe(10)
      expect(data.volumeDiscountAmount).toBe(70)
      expect(data.finalPrice).toBe(630)
    })

    it('should apply monthly discount for 28+ nights', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-01',
          checkOut: '2026-08-29',
          basePrice: 100,
          monthlyDiscountPercent: 20,
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.nights).toBe(28)
      expect(data.volumeDiscountType).toBe('monthly')
      expect(data.volumeDiscountPercent).toBe(20)
      expect(data.finalPrice).toBe(2240)
    })

    it('should apply loyalty discount in cascade', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-15',
          checkOut: '2026-08-22',
          basePrice: 100,
          weeklyDiscountPercent: 10,
          loyaltyDiscountPercent: 5,
          isLoyaltyGuest: true,
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.loyaltyDiscountPercent).toBe(5)
      expect(data.loyaltyDiscountAmount).toBe(31.5)
      expect(data.finalPrice).toBe(598.5)
    })

    it('should add fees to final price', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-15',
          checkOut: '2026-08-20',
          basePrice: 100,
          fees: [
            { name: 'Limpeza', amount: 50 },
            { name: 'Pet', amount: 25 },
          ],
        }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.feesTotal).toBe(75)
      expect(data.finalPrice).toBe(575)
    })
  })

  describe('Error handling', () => {
    it('should return 400 for missing propertyId', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          checkIn: '2026-08-15',
          checkOut: '2026-08-20',
          basePrice: 100,
        }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('propertyId')
    })

    it('should return 400 for missing dates', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          basePrice: 100,
        }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('checkIn')
    })

    it('should return 400 for invalid base price', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-15',
          checkOut: '2026-08-20',
          basePrice: 0,
        }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('basePrice')
    })

    it('should return 400 for invalid date range', async () => {
      const request = new Request('http://localhost:3000/api/reservations/calculate-price', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: 'prop-123',
          checkIn: '2026-08-20',
          checkOut: '2026-08-15',
          basePrice: 100,
        }),
      })

      const response = await POST(request as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })
})
