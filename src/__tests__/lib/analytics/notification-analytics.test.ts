import {
  calculateMetrics,
  filterNotificationLogs,
  paginateNotificationLogs,
  groupNotificationsByReservation,
  canResendNotification,
} from '@/lib/analytics/notification-analytics'
import type { NotificationLog } from '@/lib/analytics/notification-analytics'

describe('Notification Analytics', () => {
  const mockLogs: NotificationLog[] = [
    {
      id: '1',
      type: 'email',
      reservation_id: 'res-1',
      guest_email: 'guest@email.com',
      status: 'sent',
      message_id: 'msg-1',
      sent_at: '2026-07-30T10:00:00Z',
      created_at: '2026-07-30T10:00:00Z',
    },
    {
      id: '2',
      type: 'email',
      reservation_id: 'res-1',
      guest_email: 'guest@email.com',
      status: 'failed',
      error_message: 'Invalid email',
      sent_at: '2026-07-30T10:05:00Z',
      created_at: '2026-07-30T10:05:00Z',
    },
    {
      id: '3',
      type: 'sms',
      reservation_id: 'res-2',
      guest_phone: '+55119876543',
      status: 'sent',
      message_id: 'sms-1',
      sent_at: '2026-07-30T10:10:00Z',
      created_at: '2026-07-30T10:10:00Z',
    },
    {
      id: '4',
      type: 'sms',
      reservation_id: 'res-2',
      guest_phone: '+55119876543',
      status: 'sent',
      message_id: 'sms-2',
      sent_at: '2026-07-30T10:15:00Z',
      created_at: '2026-07-30T10:15:00Z',
    },
  ]

  describe('calculateMetrics', () => {
    it('should calculate metrics from notification logs', () => {
      const metrics = calculateMetrics(mockLogs)

      expect(metrics.total).toBe(4)
      expect(metrics.sent).toBe(3)
      expect(metrics.failed).toBe(1)
      expect(metrics.pending).toBe(0)
      expect(metrics.successRate).toBe(75)
      expect(metrics.failureRate).toBe(25)
    })

    it('should separate email and SMS metrics', () => {
      const metrics = calculateMetrics(mockLogs)

      expect(metrics.emailTotal).toBe(2)
      expect(metrics.emailSent).toBe(1)
      expect(metrics.emailFailed).toBe(1)
      expect(metrics.smsTotal).toBe(2)
      expect(metrics.smsSent).toBe(2)
      expect(metrics.smsFailed).toBe(0)
    })

    it('should handle empty logs', () => {
      const metrics = calculateMetrics([])

      expect(metrics.total).toBe(0)
      expect(metrics.sent).toBe(0)
      expect(metrics.successRate).toBe(0)
    })
  })

  describe('filterNotificationLogs', () => {
    it('should filter by type', () => {
      const filtered = filterNotificationLogs(mockLogs, { type: 'email' })

      expect(filtered).toHaveLength(2)
      expect(filtered.every((l) => l.type === 'email')).toBe(true)
    })

    it('should filter by status', () => {
      const filtered = filterNotificationLogs(mockLogs, { status: 'sent' })

      expect(filtered).toHaveLength(3)
      expect(filtered.every((l) => l.status === 'sent')).toBe(true)
    })

    it('should filter by type and status', () => {
      const filtered = filterNotificationLogs(mockLogs, {
        type: 'sms',
        status: 'sent',
      })

      expect(filtered).toHaveLength(2)
      expect(filtered.every((l) => l.type === 'sms' && l.status === 'sent')).toBe(true)
    })

    it('should filter by date range', () => {
      const startDate = new Date('2026-07-30T10:05:00Z')
      const endDate = new Date('2026-07-30T10:15:00Z')

      const filtered = filterNotificationLogs(mockLogs, { startDate, endDate })

      expect(filtered.length).toBeGreaterThan(0)
      expect(filtered.every((l) => {
        const logDate = new Date(l.sent_at)
        return logDate >= startDate && logDate <= endDate
      })).toBe(true)
    })

    it('should sort by sent_at descending', () => {
      const filtered = filterNotificationLogs(mockLogs)

      for (let i = 0; i < filtered.length - 1; i++) {
        expect(new Date(filtered[i].sent_at).getTime()).toBeGreaterThanOrEqual(
          new Date(filtered[i + 1].sent_at).getTime()
        )
      }
    })
  })

  describe('paginateNotificationLogs', () => {
    it('should paginate logs correctly', () => {
      const result = paginateNotificationLogs(mockLogs, 1, 2)

      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(2)
      expect(result.total).toBe(4)
      expect(result.totalPages).toBe(2)
      expect(result.data).toHaveLength(2)
    })

    it('should handle last page with fewer items', () => {
      const result = paginateNotificationLogs(mockLogs, 2, 3)

      expect(result.page).toBe(2)
      expect(result.data).toHaveLength(1)
    })

    it('should use default page and pageSize', () => {
      const result = paginateNotificationLogs(mockLogs)

      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })
  })

  describe('groupNotificationsByReservation', () => {
    it('should group logs by reservation_id', () => {
      const grouped = groupNotificationsByReservation(mockLogs)

      expect(Object.keys(grouped)).toHaveLength(2)
      expect(grouped['res-1']).toHaveLength(2)
      expect(grouped['res-2']).toHaveLength(2)
    })

    it('should preserve all logs in groups', () => {
      const grouped = groupNotificationsByReservation(mockLogs)
      const flattened = Object.values(grouped).flat()

      expect(flattened).toHaveLength(mockLogs.length)
    })
  })

  describe('canResendNotification', () => {
    it('should allow resend for failed notifications', () => {
      const failedLog = mockLogs.find((l) => l.status === 'failed')!
      expect(canResendNotification(failedLog)).toBe(true)
    })

    it('should not allow resend for sent notifications', () => {
      const sentLog = mockLogs.find((l) => l.status === 'sent')!
      expect(canResendNotification(sentLog)).toBe(false)
    })

    it('should not allow resend for pending notifications', () => {
      const pendingLog: NotificationLog = {
        ...mockLogs[0],
        status: 'pending',
      }
      expect(canResendNotification(pendingLog)).toBe(false)
    })
  })
})
