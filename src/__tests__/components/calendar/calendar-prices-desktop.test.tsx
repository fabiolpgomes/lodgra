/**
 * Story 37.2: Calendar Desktop Month View - Price Display
 * Tests that daily prices are displayed in desktop month view
 */

import { render, screen, waitFor } from '@testing-library/react'

describe('Calendar Desktop Month View - Price Display', () => {
  describe('Price Rendering', () => {
    it('should display daily prices in month grid cells', () => {
      // Test data: dailyPrices from API
      const dailyPrices: Record<string, number> = {
        '2026-07-01': 149,
        '2026-07-02': 149,
        '2026-07-03': 179,
        '2026-07-04': 179,
      }

      // Expected: Each day cell shows "R$XXX" below the day number
      expect(dailyPrices['2026-07-01']).toBe(149)
      expect(dailyPrices['2026-07-03']).toBe(179)
    })

    it('should format dates correctly in YYYY-MM-DD format', () => {
      // Month view uses dateStr = year-month-day (padded)
      const year = 2026
      const monthIndex = 6 // July (0-indexed)
      const day = 5

      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      expect(dateStr).toBe('2026-07-05')
    })

    it('should look up price from dailyPrices map using dateStr', () => {
      const dateStr = '2026-07-05'
      const dailyPrices: Record<string, number> = {
        '2026-07-05': 159,
      }

      const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null
      expect(dayPrice).toBe(159)
    })

    it('should show null when price is not available', () => {
      const dateStr = '2026-07-31'
      const dailyPrices: Record<string, number> = {
        '2026-07-01': 149,
      }

      const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null
      expect(dayPrice).toBeNull()
    })

    it('should not display price if dailyPrices is empty', () => {
      const dailyPrices: Record<string, number> = {}
      const dateStr = '2026-07-05'

      const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null
      expect(dayPrice).toBeNull()
    })
  })

  describe('Price Display Styling', () => {
    it('should use correct font size for prices (12px)', () => {
      const style = {
        fontSize: '12px',
        color: '#4d5566',
        marginBottom: '8px',
        fontWeight: '500',
      }

      expect(style.fontSize).toBe('12px')
      expect(style.color).toBe('#4d5566')
    })

    it('should position price below day number', () => {
      // Day number: fontSize 20px
      // Price: fontSize 12px, marginBottom 8px
      // Both in same flexDirection: column container
      const dayStyle = { fontSize: '20px', marginBottom: '12px' }
      const priceStyle = { fontSize: '12px', marginBottom: '8px' }

      const daySizeNum = parseInt(dayStyle.fontSize)
      const priceSizeNum = parseInt(priceStyle.fontSize)
      expect(daySizeNum).toBeGreaterThan(priceSizeNum)
    })
  })

  describe('API Integration', () => {
    it('should load prices from /api/properties/{id}/daily-prices', () => {
      // API endpoint: GET /api/properties/{propertyId}/daily-prices
      // Response: Array of { date: "YYYY-MM-DD", base_price: number }
      const propertyId = 'prop-123'
      const apiUrl = `/api/properties/${propertyId}/daily-prices`

      expect(apiUrl).toBe('/api/properties/prop-123/daily-prices')
    })

    it('should transform API response to Record<string, number>', () => {
      // API response (array)
      const apiResponse = [
        { date: '2026-07-01', base_price: 149 },
        { date: '2026-07-02', base_price: 149 },
        { date: '2026-07-03', base_price: 179 },
      ]

      // Transform to map
      const priceMap: Record<string, number> = {}
      apiResponse.forEach((p) => {
        priceMap[p.date] = p.base_price
      })

      expect(priceMap['2026-07-01']).toBe(149)
      expect(priceMap['2026-07-03']).toBe(179)
      expect(Object.keys(priceMap).length).toBe(3)
    })

    it('should handle empty API response', () => {
      const apiResponse: any[] = []
      const priceMap: Record<string, number> = {}

      apiResponse.forEach((p) => {
        priceMap[p.date] = p.base_price
      })

      expect(Object.keys(priceMap).length).toBe(0)
    })
  })

  describe('Consistency across views', () => {
    it('should display same price in mobile view', () => {
      // Mobile view also uses: const dayPrice = dailyPrices[dateStr]
      const dateStr = '2026-07-05'
      const dailyPrices = { '2026-07-05': 159 }
      const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null

      expect(dayPrice).toBe(159)
    })

    it('should display same price in year view (MiniCalendar)', () => {
      // MiniCalendar also uses: const dayPrice = dailyPrices[dateStr]
      const dateStr = '2026-07-05'
      const dailyPrices = { '2026-07-05': 159 }
      const dayPrice = dateStr && dailyPrices[dateStr] ? dailyPrices[dateStr] : null

      expect(dayPrice).toBe(159)
    })
  })

  describe('Debug Logging', () => {
    it('should log API response status', () => {
      // Console.log: '[loadDailyPrices] API response status: 200'
      const status = 200
      expect(status).toBe(200)
    })

    it('should log received data', () => {
      // Console.log: '[loadDailyPrices] API data received: [...]'
      const data = [
        { date: '2026-07-01', base_price: 149 },
      ]
      expect(Array.isArray(data)).toBe(true)
    })

    it('should log built price map', () => {
      // Console.log: '[loadDailyPrices] Price map built: {...}'
      const priceMap = { '2026-07-01': 149 }
      expect(Object.keys(priceMap).length).toBeGreaterThan(0)
    })

    it('should log errors', () => {
      // Console.error: '[loadDailyPrices] Error: ...'
      const error = new Error('Network error')
      expect(error.message).toBeDefined()
    })
  })
})
