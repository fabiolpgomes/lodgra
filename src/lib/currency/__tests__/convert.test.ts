/**
 * Tests for Currency Conversion
 */

import { convertCurrency, convertToMultipleCurrencies, convertToEUR } from '../convert'
import * as ratesModule from '@/lib/forex/rates'

// Mock the rates module
jest.mock('@/lib/forex/rates', () => ({
  getRates: jest.fn(),
}))

describe('Currency Conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockRates = {
    EUR: 1,
    BRL: 5.5,
    USD: 1.1,
  }

  describe('convertCurrency', () => {
    it('should return EUR amount unchanged when target is EUR', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertCurrency(100, 'EUR')
      expect(result).toBe(100)
    })

    it('should convert EUR to BRL correctly', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertCurrency(100, 'BRL')
      expect(result).toBe(550) // 100 * 5.5
    })

    it('should convert EUR to USD correctly', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertCurrency(100, 'USD')
      expect(result).toBe(110) // 100 * 1.1
    })

    it('should round to 2 decimal places', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue({
        EUR: 1,
        BRL: 5.555,
        USD: 1.1,
      })

      const result = await convertCurrency(10, 'BRL')
      // 10 * 5.555 = 55.55 (should round to 2 decimals)
      expect(typeof result === 'number').toBe(true)
      expect(result.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
    })

    it('should handle fractional amounts', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertCurrency(19, 'BRL')
      // 19 * 5.5 = 104.5
      expect(result).toBe(104.5)
    })

    it('should handle very small amounts', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertCurrency(0.01, 'USD')
      // 0.01 * 1.1 = 0.011, but rounding to 2 decimals = 0.01
      expect(result).toBe(0.01)
    })
  })

  describe('convertToMultipleCurrencies', () => {
    it('should convert to multiple currencies at once', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertToMultipleCurrencies(100, ['EUR', 'BRL', 'USD'])

      expect(result.EUR).toBe(100)
      expect(result.BRL).toBe(550)
      expect(result.USD).toBe(110)
    })

    it('should handle partial currency list', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertToMultipleCurrencies(0.5, ['BRL', 'USD'])

      expect(result.BRL).toBe(2.75)
      expect(result.USD).toBe(0.55)
      expect(result.EUR).toBeUndefined()
    })
  })

  describe('convertToEUR', () => {
    it('should return EUR amount unchanged when source is EUR', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertToEUR(100, 'EUR')
      expect(result).toBe(100)
    })

    it('should reverse-convert BRL to EUR correctly', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertToEUR(550, 'BRL')
      // 550 / 5.5 = 100
      expect(result).toBeCloseTo(100, 2)
    })

    it('should reverse-convert USD to EUR correctly', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await convertToEUR(110, 'USD')
      // 110 / 1.1 = 100
      expect(result).toBeCloseTo(100, 2)
    })
  })

  describe('Realistic scenarios', () => {
    it('should handle booking price conversion (19 EUR → BRL/USD)', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      const eur = 19
      const brl = await convertCurrency(eur, 'BRL')
      const usd = await convertCurrency(eur, 'USD')

      // 19 EUR ≈ 104.5 BRL
      expect(brl).toBeCloseTo(104.5, 1)
      // 19 EUR ≈ 20.9 USD
      expect(usd).toBeCloseTo(20.9, 1)
    })

    it('should handle multi-night stays', async () => {
      ;(ratesModule.getRates as jest.Mock).mockResolvedValue(mockRates)

      // 5 nights at 19 EUR/night = 95 EUR
      const total = 95
      const result = await convertToMultipleCurrencies(total, ['EUR', 'BRL', 'USD'])

      expect(result.EUR).toBe(95)
      expect(result.BRL).toBeCloseTo(522.5, 1) // 95 * 5.5 = 522.5
      expect(result.USD).toBeCloseTo(104.5, 1) // 95 * 1.1 = 104.5
    })
  })
})
