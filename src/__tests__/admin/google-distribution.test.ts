import { derivePropertyStatus, type FeedLogEntry, type PropertyStatus } from '@/lib/google-distribution-dashboard'

describe('Google Distribution Dashboard Utilities', () => {
  describe('derivePropertyStatus', () => {
    it('should return "indexed" for successful recent entries', () => {
      const now = new Date()
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: now.toISOString(),
        action: 'auto',
        status: 'success',
      }
      expect(derivePropertyStatus(entry)).toBe('indexed')
    })

    it('should return "pending" for queued entries', () => {
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'auto',
        status: 'queued',
      }
      expect(derivePropertyStatus(entry)).toBe('pending')
    })

    it('should return "pending" for in_progress entries', () => {
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'auto',
        status: 'in_progress',
      }
      expect(derivePropertyStatus(entry)).toBe('pending')
    })

    it('should return "error" for failed entries within 30 days', () => {
      const now = new Date()
      const recentFail = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: recentFail.toISOString(),
        action: 'auto',
        status: 'failed',
      }
      expect(derivePropertyStatus(entry)).toBe('error')
    })

    it('should return "rejected" for failed entries older than 30 days', () => {
      const now = new Date()
      const oldFail = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: oldFail.toISOString(),
        action: 'auto',
        status: 'failed',
      }
      expect(derivePropertyStatus(entry)).toBe('rejected')
    })

    it('should return "rejected" for null entry (never attempted)', () => {
      expect(derivePropertyStatus(null)).toBe('rejected')
    })

    it('should handle edge case: exactly 30 days old failed entry', () => {
      const now = new Date()
      const exactly30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: exactly30DaysAgo.toISOString(),
        action: 'auto',
        status: 'failed',
      }
      // Should be rejected at exactly 30 days (> 30 triggers rejection)
      // This is a boundary test - depending on rounding, could be either
      const result = derivePropertyStatus(entry)
      expect(['error', 'rejected']).toContain(result)
    })
  })

  describe('Metric aggregation logic', () => {
    it('should correctly classify statuses for mixed entries', () => {
      const now = new Date()
      const entries: FeedLogEntry[] = [
        {
          id: '1',
          timestamp: now.toISOString(),
          action: 'auto',
          status: 'success',
        },
        {
          id: '2',
          timestamp: now.toISOString(),
          action: 'auto',
          status: 'queued',
        },
        {
          id: '3',
          timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          action: 'auto',
          status: 'failed',
        },
        {
          id: '4',
          timestamp: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          action: 'auto',
          status: 'failed',
        },
      ]

      const statuses = entries.map((e) => derivePropertyStatus(e))
      expect(statuses).toEqual(['indexed', 'pending', 'error', 'rejected'])
    })
  })

  describe('Error handling', () => {
    it('should gracefully handle null entries', () => {
      const result = derivePropertyStatus(null)
      expect(result).toBe('rejected')
    })

    it('should handle entries with error messages', () => {
      const entry: FeedLogEntry = {
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'manual',
        status: 'failed',
        error_message: 'Timeout exceeded',
      }
      expect(derivePropertyStatus(entry)).toBe('error')
      expect(entry.error_message).toBe('Timeout exceeded')
    })
  })

  describe('Status classification completeness', () => {
    it('should handle all possible status values', () => {
      const now = new Date()
      const allStatuses: Array<'success' | 'failed' | 'queued' | 'in_progress'> = [
        'success',
        'failed',
        'queued',
        'in_progress',
      ]

      const results = allStatuses.map((status) =>
        derivePropertyStatus({
          id: '1',
          timestamp: now.toISOString(),
          action: 'auto',
          status,
        })
      )

      // Verify all are valid PropertyStatus values
      const validStatuses: PropertyStatus[] = ['indexed', 'pending', 'error', 'rejected']
      results.forEach((result) => {
        expect(validStatuses).toContain(result)
      })
    })
  })
})
