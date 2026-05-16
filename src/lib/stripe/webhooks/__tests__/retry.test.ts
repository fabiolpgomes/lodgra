/**
 * Story 12.4: Retry Logic Tests
 * Validates exponential backoff and retry behavior
 */

import { processWithRetry, processWebhookWithRetry, RETRY_CONFIG } from '../retry'

describe('Webhook Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('processWithRetry', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      const result = await processWithRetry(mockFn)

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce('success on 3rd try')

      const result = await processWithRetry(mockFn)

      expect(result).toBe('success on 3rd try')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries exhausted', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'))

      await expect(processWithRetry(mockFn)).rejects.toThrow('Persistent failure')
      expect(mockFn).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })

    it('should respect exponential backoff timing', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success')

      const timeBefore = Date.now()
      await processWithRetry(mockFn)
      const elapsedMs = Date.now() - timeBefore

      // Expected: 1000ms + 2000ms = 3000ms minimum
      expect(elapsedMs).toBeGreaterThanOrEqual(2900) // Allow 100ms margin
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should return typed result correctly', async () => {
      interface User {
        id: string
        name: string
      }

      const mockUser: User = { id: '123', name: 'Test User' }
      const mockFn = jest.fn().mockResolvedValue(mockUser)

      const result = await processWithRetry<User>(mockFn)

      expect(result.id).toBe('123')
      expect(result.name).toBe('Test User')
    })
  })

  describe('processWebhookWithRetry', () => {
    it('should process webhook successfully with retry', async () => {
      const mockFn = jest.fn().mockResolvedValue({ processed: true })
      const result = await processWebhookWithRetry('evt_123', mockFn)

      expect(result).toEqual({ processed: true })
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should retry webhook processing on failure', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce({ processed: true })

      const result = await processWebhookWithRetry('evt_456', mockFn)

      expect(result).toEqual({ processed: true })
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should include context in error message', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'))
      const context = { chargeId: 'ch_123', amount: 5000 }

      await expect(processWebhookWithRetry('evt_789', mockFn, context)).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('evt_789'),
        expect.objectContaining({
          error: 'Persistent error',
          context,
        })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle zero context gracefully', async () => {
      const mockFn = jest.fn().mockResolvedValue({ ok: true })
      const result = await processWebhookWithRetry('evt_000', mockFn)

      expect(result).toEqual({ ok: true })
    })
  })

  describe('RETRY_CONFIG', () => {
    it('should export correct retry configuration', () => {
      expect(RETRY_CONFIG).toEqual({
        maxRetries: 3,
        backoffMs: 1000,
        intervals: [1000, 2000, 4000],
        description: expect.stringContaining('3 times'),
      })
    })

    it('should export intervals in exponential order', () => {
      const [first, second, third] = RETRY_CONFIG.intervals
      expect(second).toBe(first * 2)
      expect(third).toBe(second * 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined returns', async () => {
      const mockFn = jest.fn().mockResolvedValue(null)
      const result = await processWithRetry(mockFn)

      expect(result).toBeNull()
    })

    it('should handle non-Error thrown values', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        throw 'String error'
      })

      await expect(processWithRetry(mockFn)).rejects.toBe('String error')
    })

    it('should maintain function context (this binding)', async () => {
      const obj = {
        value: 42,
        fn: function () {
          return Promise.resolve(this.value)
        },
      }

      const result = await processWithRetry(() => obj.fn.call(obj))
      expect(result).toBe(42)
    })

    it('should work with async/await and promises interchangeably', async () => {
      const asyncFn = jest.fn(async () => 'async result')
      const promiseFn = jest.fn(() => Promise.resolve('promise result'))

      const result1 = await processWithRetry(asyncFn)
      const result2 = await processWithRetry(promiseFn)

      expect(result1).toBe('async result')
      expect(result2).toBe('promise result')
    })
  })

  describe('Concurrent Retries', () => {
    it('should handle multiple concurrent retry processes', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('result1')
      const mockFn2 = jest.fn().mockResolvedValue('result2')
      const mockFn3 = jest.fn().mockResolvedValue('result3')

      const results = await Promise.all([
        processWithRetry(mockFn1),
        processWithRetry(mockFn2),
        processWithRetry(mockFn3),
      ])

      expect(results).toEqual(['result1', 'result2', 'result3'])
      expect(mockFn1).toHaveBeenCalledTimes(1)
      expect(mockFn2).toHaveBeenCalledTimes(1)
      expect(mockFn3).toHaveBeenCalledTimes(1)
    })
  })
})
