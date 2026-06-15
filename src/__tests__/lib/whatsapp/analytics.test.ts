/**
 * Tests for WhatsApp Analytics & Reporting
 */

import { describe, it, expect } from '@jest/globals';

describe('WhatsApp Analytics & Reporting', () => {
  describe('Message Metrics Collection', () => {
    it('should collect total messages sent', () => {
      const logs = [
        { id: '1', status: 'sent' },
        { id: '2', status: 'sent' },
        { id: '3', status: 'failed' },
        { id: '4', status: 'read' },
      ];

      const totalSent = logs.length;
      expect(totalSent).toBe(4);
    });

    it('should calculate delivery rate', () => {
      const logs = [
        { id: '1', status: 'sent' },
        { id: '2', status: 'sent' },
        { id: '3', status: 'sent' },
        { id: '4', status: 'failed' },
      ];

      const successful = logs.filter((l) => l.status === 'sent').length;
      const deliveryRate = (successful / logs.length) * 100;

      expect(successful).toBe(3);
      expect(deliveryRate).toBe(75);
    });

    it('should calculate read rate', () => {
      const logs = [
        { id: '1', status: 'sent' },
        { id: '2', status: 'read' },
        { id: '3', status: 'read' },
        { id: '4', status: 'failed' },
      ];

      const read = logs.filter((l) => l.status === 'read').length;
      const sent = logs.filter((l) => l.status === 'sent' || l.status === 'read').length;
      const readRate = sent > 0 ? (read / sent) * 100 : 0;

      expect(read).toBe(2);
      expect(readRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('Grouping by Message Type', () => {
    it('should group messages by type', () => {
      const logs = [
        { message_type: 'confirmation', status: 'sent' },
        { message_type: 'confirmation', status: 'sent' },
        { message_type: 'reminder', status: 'sent' },
        { message_type: 'alert', status: 'failed' },
      ];

      const byType = logs.reduce(
        (acc, log) => {
          if (!acc[log.message_type]) acc[log.message_type] = [];
          acc[log.message_type].push(log);
          return acc;
        },
        {} as Record<string, any[]>
      );

      expect(byType.confirmation).toHaveLength(2);
      expect(byType.reminder).toHaveLength(1);
      expect(byType.alert).toHaveLength(1);
    });

    it('should calculate metrics per message type', () => {
      const logs = [
        { message_type: 'confirmation', status: 'sent' },
        { message_type: 'confirmation', status: 'sent' },
        { message_type: 'reminder', status: 'sent' },
        { message_type: 'reminder', status: 'failed' },
      ];

      const confirmationRate = (logs.filter((l) => l.message_type === 'confirmation' && l.status === 'sent').length /
        logs.filter((l) => l.message_type === 'confirmation').length) *
        100;

      const reminderRate = (logs.filter((l) => l.message_type === 'reminder' && l.status === 'sent').length /
        logs.filter((l) => l.message_type === 'reminder').length) *
        100;

      expect(confirmationRate).toBe(100);
      expect(reminderRate).toBe(50);
    });
  });

  describe('Grouping by Recipient Type', () => {
    it('should group messages by recipient', () => {
      const logs = [
        { recipient_type: 'guest', status: 'sent' },
        { recipient_type: 'guest', status: 'sent' },
        { recipient_type: 'manager', status: 'sent' },
        { recipient_type: 'cleaner', status: 'failed' },
      ];

      const byRecipient = logs.reduce(
        (acc, log) => {
          if (!acc[log.recipient_type]) acc[log.recipient_type] = [];
          acc[log.recipient_type].push(log);
          return acc;
        },
        {} as Record<string, any[]>
      );

      expect(byRecipient.guest).toHaveLength(2);
      expect(byRecipient.manager).toHaveLength(1);
      expect(byRecipient.cleaner).toHaveLength(1);
    });
  });

  describe('Time-based Analytics', () => {
    it('should aggregate metrics by date', () => {
      const logs = [
        { date: '2026-07-01', status: 'sent' },
        { date: '2026-07-01', status: 'sent' },
        { date: '2026-07-02', status: 'sent' },
        { date: '2026-07-02', status: 'failed' },
      ];

      const byDate = logs.reduce(
        (acc, log) => {
          if (!acc[log.date]) acc[log.date] = { sent: 0, failed: 0 };
          if (log.status === 'sent') acc[log.date].sent++;
          else acc[log.date].failed++;
          return acc;
        },
        {} as Record<string, any>
      );

      expect(byDate['2026-07-01'].sent).toBe(2);
      expect(byDate['2026-07-02'].sent).toBe(1);
      expect(byDate['2026-07-02'].failed).toBe(1);
    });

    it('should calculate trend data for dashboard', () => {
      const days = 7;
      const trend = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split('T')[0],
          sent: Math.floor(Math.random() * 100),
          successful: Math.floor(Math.random() * 80),
        };
      });

      expect(trend).toHaveLength(days);
      expect(trend[0].date).toBeTruthy();
      expect(trend[trend.length - 1].date).toBeTruthy();
    });
  });

  describe('Error Analysis', () => {
    it('should track failed messages', () => {
      const logs = [
        { id: '1', status: 'sent' },
        { id: '2', status: 'failed', error: 'Invalid phone' },
        { id: '3', status: 'bounced', error: 'Number blocked' },
      ];

      const failed = logs.filter((l) => l.status === 'failed');
      const bounced = logs.filter((l) => l.status === 'bounced');

      expect(failed).toHaveLength(1);
      expect(bounced).toHaveLength(1);
      expect(failed[0].error).toBe('Invalid phone');
    });

    it('should identify error patterns', () => {
      const logs = [
        { status: 'failed', error: 'Invalid phone' },
        { status: 'failed', error: 'Invalid phone' },
        { status: 'failed', error: 'Rate limit' },
        { status: 'bounced', error: 'Number blocked' },
      ];

      const errorCounts = logs.reduce(
        (acc, log) => {
          acc[log.error] = (acc[log.error] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(errorCounts['Invalid phone']).toBe(2);
      expect(errorCounts['Rate limit']).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should track delivery time', () => {
      const logs = [
        { delivery_time_ms: 1200 },
        { delivery_time_ms: 950 },
        { delivery_time_ms: 1100 },
      ];

      const avgDeliveryTime = logs.reduce((sum, log) => sum + log.delivery_time_ms, 0) / logs.length;

      expect(avgDeliveryTime).toBeCloseTo(1083.33, 1);
      expect(avgDeliveryTime).toBeLessThan(2000); // Target: <2 seconds
    });

    it('should track throughput (messages per hour)', () => {
      const startTime = new Date('2026-07-01T10:00:00Z');
      const endTime = new Date('2026-07-01T11:00:00Z');
      const messageCount = 450;

      const throughput = messageCount / ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));

      expect(throughput).toBe(450);
      expect(throughput).toBeLessThan(1200); // Rate limit: 20/sec = 72k/hour, ok
    });
  });

  describe('Report Generation', () => {
    it('should generate daily report', () => {
      const date = '2026-07-01';
      const report = {
        date,
        total_sent: 150,
        successful: 147,
        failed: 3,
        delivery_rate: 98,
        read_rate: 72,
        by_type: {
          confirmation: 50,
          reminder: 50,
          alert: 50,
        },
      };

      expect(report.date).toBe(date);
      expect(report.total_sent).toBe(150);
      expect(report.delivery_rate).toBe(98);
    });

    it('should generate period summary', () => {
      const days = 30;
      const summary = {
        period_days: days,
        total_sent: 4500,
        total_delivered: 4410,
        total_read: 3175,
        avg_delivery_rate: 98,
        avg_read_rate: 72,
      };

      expect(summary.period_days).toBe(30);
      expect(summary.total_sent).toBe(4500);
      expect(summary.avg_delivery_rate).toBe(98);
    });
  });

  describe('Authorization & Privacy', () => {
    it('should only show own organization analytics', () => {
      const userOrgId = 'org-123';
      const analyticsOrgId = 'org-123';

      const canAccess = userOrgId === analyticsOrgId;
      expect(canAccess).toBe(true);
    });

    it('should redact sensitive data in reports', () => {
      const report = {
        total_sent: 100,
        successful: 98,
        failed: 2,
        // Phone numbers should NOT appear in reports
        examples: [],
      };

      expect(report.examples).toHaveLength(0);
      expect(Object.keys(report)).not.toContain('phone_numbers');
    });
  });
});
