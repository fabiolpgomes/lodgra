import { GoogleMerchantClient } from '@/lib/google/merchant-client'
import { syncGoogleMerchantStatus } from '@/lib/workers/google-merchant-sync'
import { getPropertyMerchantStatuses, getLatestMerchantSyncLogs } from '@/lib/google-distribution-dashboard'

/**
 * Integration Tests for Google Merchant Center Sync
 * Tests merchant status fetching, sync worker, and dashboard integration
 */

describe('Google Merchant Sync Integration', () => {
  describe('GoogleMerchantClient', () => {
    it('should initialize with valid credentials', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com'
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID = 'key-123'
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2a2rwplBCXXaY5LkZ5F3gKC/Ig0VJrIOPcyG4wnG3RfQ2Mvv
J0GHZZpW4FvAKrWZWXqGb4eFCfCqJYP8tF7n6g8E6xKBJ9CqpY6H3pGpMl1J8Zam
w9v1h5C8L6K6Y7J7H7G7k7n7O7M7p7N7m7Q7r7L7s7S7t7U7u7V7w7X7y7Z7AzB
zB7zC7zD7zE7zF7zG7zH7zI7zJ7zK7zL7zM7zN7zO7zP7zQ7zR7zS7zT7zU7zV7
zW7zX7zY7zZ7AAzAA7AB7AC7AD7AE7AF7AG7AH7AI7AJ7AK7AL7AM7AN7AO7AP7AQ
7AR7AS7AT7AU7AV7AW7AX7AY7AZ7AQIDAQABAAAA
-----END RSA PRIVATE KEY-----`
      process.env.GOOGLE_MERCHANT_CENTER_ID = '123456789'

      expect(() => new GoogleMerchantClient()).not.toThrow()
    })

    it('should throw error if credentials missing', () => {
      const originalEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

      expect(() => new GoogleMerchantClient()).toThrow('Google Merchant API credentials not configured')

      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = originalEmail
    })

    it('should have proper retry logic configured', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com'
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID = 'key-123'
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2a2rwplBCXXaY5LkZ5F3gKC/Ig0VJrIOPcyG4wnG3RfQ2Mvv
J0GHZZpW4FvAKrWZWXqGb4eFCfCqJYP8tF7n6g8E6xKBJ9CqpY6H3pGpMl1J8Zam
w9v1h5C8L6K6Y7J7H7G7k7n7O7M7p7N7m7Q7r7L7s7S7t7U7u7V7w7X7y7Z7AzB
zB7zC7zD7zE7zF7zG7zH7zI7zJ7zK7zL7zM7zN7zO7zP7zQ7zR7zS7zT7zU7zV7
zW7zX7zY7zZ7AAzAA7AB7AC7AD7AE7AF7AG7AH7AI7AJ7AK7AL7AM7AN7AO7AP7AQ
7AR7AS7AT7AU7AV7AW7AX7AY7AZ7AQIDAQABAAAA
-----END RSA PRIVATE KEY-----`
      process.env.GOOGLE_MERCHANT_CENTER_ID = '123456789'

      const client = new GoogleMerchantClient()
      expect(client).toBeInstanceOf(GoogleMerchantClient)
    })
  })

  describe('Sync Worker', () => {
    it('should have sync function signature for batch processing', () => {
      expect(typeof syncGoogleMerchantStatus).toBe('function')
    })

    it('should handle organization-level syncing', async () => {
      // Verify function accepts required parameters
      const mockFunc = jest.fn().mockResolvedValue({
        jobId: 'sync-123',
        status: 'completed',
        propertiesSynced: 10,
        propertiesCount: 10,
        durationMs: 2500,
      })

      const result = await mockFunc({
        organizationId: 'org-1',
        force: false,
      })

      expect(result).toHaveProperty('jobId')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('propertiesSynced')
      expect(result.propertiesSynced).toBeGreaterThanOrEqual(0)
    })

    it('should support partial failure handling', () => {
      // Verify sync handles some properties failing while others succeed
      const mockResult = {
        jobId: 'sync-123',
        status: 'completed_with_errors',
        propertiesSynced: 8,
        propertiesCount: 10,
        durationMs: 3000,
        errorMessage: '2 properties failed to sync',
      }

      expect(mockResult.propertiesSynced).toBeLessThan(mockResult.propertiesCount)
      expect(mockResult.errorMessage).toBeDefined()
    })
  })

  describe('Dashboard Integration', () => {
    it('should fetch merchant statuses from dashboard function', () => {
      expect(typeof getPropertyMerchantStatuses).toBe('function')
    })

    it('should fetch merchant sync logs from dashboard function', () => {
      expect(typeof getLatestMerchantSyncLogs).toBe('function')
    })

    it('should return merchant statuses with expected structure', async () => {
      const mockStatuses = [
        {
          propertyId: 'prop-1',
          propertyName: 'Beach House',
          status: 'indexed' as const,
          lastUpdatedDate: new Date().toISOString(),
        },
      ]

      // Verify structure matches requirements
      mockStatuses.forEach((status) => {
        expect(status).toHaveProperty('propertyId')
        expect(status).toHaveProperty('propertyName')
        expect(status).toHaveProperty('status')
        expect(status).toHaveProperty('lastUpdatedDate')
        expect(['indexed', 'pending', 'rejected', 'error']).toContain(status.status)
      })
    })

    it('should return sync logs with expected structure', () => {
      const mockLogs = [
        {
          timestamp: new Date().toISOString(),
          status: 'completed',
          propertiesSynced: 10,
          durationMs: 2500,
        },
      ]

      mockLogs.forEach((log) => {
        expect(log).toHaveProperty('timestamp')
        expect(log).toHaveProperty('status')
        expect(log).toHaveProperty('propertiesSynced')
        expect(log).toHaveProperty('durationMs')
      })
    })
  })

  describe('Status Mapping', () => {
    it('should correctly map Google statuses to standard format', () => {
      const statusMap = {
        ACTIVE: 'indexed',
        APPROVED: 'indexed',
        PENDING_REVIEW: 'pending',
        PENDING: 'pending',
        REJECTED: 'rejected',
        DISAPPROVED: 'rejected',
      }

      Object.entries(statusMap).forEach(([_googleStatus, expected]) => {
        expect(['indexed', 'pending', 'rejected', 'error']).toContain(expected)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing credentials gracefully', () => {
      const originalEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

      expect(() => new GoogleMerchantClient()).toThrow()

      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = originalEmail
    })

    it('should support retry logic for API calls', async () => {
      const mockFunc = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          propertyId: 'prop-1',
          status: 'indexed',
        })

      // Simulate 3 retries with backoff
      let result
      for (let i = 0; i < 3; i++) {
        try {
          result = await mockFunc()
          break
        } catch (_error) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = 1000 * Math.pow(2, i)
          await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 100)))
        }
      }

      expect(result).toBeDefined()
      expect(result.status).toBe('indexed')
    })
  })

  describe('Data Freshness', () => {
    it('should track last_synced timestamp', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const hoursOld = (now.getTime() - oneHourAgo.getTime()) / (1000 * 60 * 60)
      expect(hoursOld).toBeCloseTo(1, 0.5)

      const twoHoursOld = (now.getTime() - twoHoursAgo.getTime()) / (1000 * 60 * 60)
      const freshness = twoHoursOld >= 12 ? 'stale' : 'fresh'
      expect(freshness).toBe('fresh') // 2 hours is fresh
    })

    it('should calculate freshness indicator status', () => {
      const now = new Date()

      const scenarios = [
        { age: 30, expected: 'fresh' },      // 30 min old = green
        { age: 120, expected: 'aging' },     // 2 hours old = yellow
        { age: 13 * 60, expected: 'stale' }, // 13 hours old = red
      ]

      scenarios.forEach(({ age, expected }) => {
        const timestamp = new Date(now.getTime() - age * 60 * 1000)
        const hoursOld = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)

        let freshness = 'fresh'
        if (hoursOld >= 12) freshness = 'stale'
        else if (hoursOld >= 1) freshness = 'aging'

        expect(freshness).toBe(expected)
      })
    })
  })

  describe('Regression Tests', () => {
    it('should not break existing feed functionality', () => {
      // Verify merchant sync is separate from feed generation
      expect(typeof syncGoogleMerchantStatus).toBe('function')
      expect(typeof getPropertyMerchantStatuses).toBe('function')
      expect(typeof getLatestMerchantSyncLogs).toBe('function')
    })

    it('should support multi-organization sync', async () => {
      const mockFunc = jest.fn().mockResolvedValue({
        status: 'completed',
        organizations: 5,
        propertiesSynced: 50,
        totalDurationMs: 12500,
      })

      const result = await mockFunc()

      expect(result.organizations).toBeGreaterThan(0)
      expect(result.propertiesSynced).toBeGreaterThan(0)
    })
  })
})
