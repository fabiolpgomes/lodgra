/**
 * Tests for Forex Rates Management
 */

import { getRates, updateRates, clearCache } from '../rates'
import * as clientModule from '../client'

// Mock the client module
jest.mock('../client', () => ({
  fetchForexRates: jest.fn(),
}))

// Mock Redis (optional)
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  })),
}))

describe('Forex Rates Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.UPSTASH_REDIS_REST_URL = undefined
    process.env.UPSTASH_REDIS_REST_TOKEN = undefined
  })

  describe('getRates', () => {
    it('should fetch rates from API if cache is empty', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      await clearCache() // Clear any existing cache
      const result = await getRates()

      expect(result).toEqual(mockRates)
      expect(clientModule.fetchForexRates).toHaveBeenCalled()
    })

    it('should return fallback rates if API fails', async () => {
      ;(clientModule.fetchForexRates as jest.Mock).mockRejectedValue(
        new Error('API error')
      )

      const result = await getRates()

      expect(result).toEqual({ EUR: 1, BRL: 5.5, USD: 1.1 })
    })

    it('should cache rates in memory', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      // Clear cache first
      await clearCache()

      // First call fetches from API
      const result1 = await getRates()
      expect(result1).toEqual(mockRates)

      // Verify API was called for first request
      const callCount1 = (clientModule.fetchForexRates as jest.Mock).mock.calls.length
      expect(callCount1).toBeGreaterThan(0)

      // Second call should use cache
      const result2 = await getRates()
      // Should still have original rates (from cache)
      expect(result2).toEqual(mockRates)

      // Verify API was NOT called again (cache used)
      const callCount2 = (clientModule.fetchForexRates as jest.Mock).mock.calls.length
      expect(callCount2).toBe(callCount1) // Should be same as before (no new call)
    })
  })

  describe('updateRates', () => {
    it('should fetch and cache fresh rates', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      const result = await updateRates()

      expect(result).toEqual(mockRates)
      expect(clientModule.fetchForexRates).toHaveBeenCalled()
    })

    it('should return fallback if update fails', async () => {
      ;(clientModule.fetchForexRates as jest.Mock).mockRejectedValue(
        new Error('API error')
      )

      const result = await updateRates()

      expect(result).toEqual({ EUR: 1, BRL: 5.5, USD: 1.1 })
    })
  })

  describe('clearCache', () => {
    it('should clear in-memory cache', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      // Populate cache
      await getRates()

      // Clear cache
      await clearCache()

      // Next call should fetch fresh (but we'll return fallback since API will fail)
      ;(clientModule.fetchForexRates as jest.Mock).mockRejectedValue(
        new Error('API error')
      )

      const result = await getRates()
      // After cache clear, should use fallback
      expect(result).toEqual({ EUR: 1, BRL: 5.5, USD: 1.1 })
    })
  })

  describe('Rate values', () => {
    it('should have EUR as base (1.0)', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      const rates = await getRates()
      expect(rates.EUR).toBe(1)
    })

    it('should have reasonable BRL rate (> EUR)', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      const rates = await getRates()
      expect(rates.BRL).toBeGreaterThan(1)
      expect(rates.BRL).toBeGreaterThan(rates.USD)
    })

    it('should have reasonable USD rate (close to EUR)', async () => {
      const mockRates = { EUR: 1, BRL: 5.5, USD: 1.1 }
      ;(clientModule.fetchForexRates as jest.Mock).mockResolvedValue(mockRates)

      await clearCache()
      const rates = await getRates()
      expect(rates.USD).toBeCloseTo(1.1, 0) // USD is around 1.1 to EUR
      expect(rates.USD).toBeLessThan(rates.BRL)
    })
  })
})
