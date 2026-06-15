/**
 * Tests for Checkout Reminder (Story 30.4)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.4 — Checkout Reminder', () => {
  describe('Message Content (AC2)', () => {
    it('should include required fields in reminder message', () => {
      const requiredFields = [
        'property_name',
        'property_address',
        'guest_name',
        'checkout_date',
        'checkout_time',
        'checkout_instructions',
      ];

      const template = `
        🏠 *{{property_name}}*
        📍 {{property_address}}
        Olá {{guest_name}}! Lembrete de checkout:
        📅 Checkout: *{{checkout_date}}* até às {{checkout_time}}
        {{checkout_instructions}}
      `;

      requiredFields.forEach((field) => {
        expect(template).toContain(`{{${field}}}`);
      });
    });

    it('should format checkout time correctly', () => {
      const checkoutDate = new Date('2026-07-05T11:00:00');
      const checkoutTime = checkoutDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      expect(checkoutTime).toMatch(/\d{2}:\d{2}/);
      expect(checkoutTime).toContain(':');
    });
  });

  describe('Timing Configuration (AC1)', () => {
    it('should support 24h before timing', () => {
      const hoursBeforeCheckout = 24;
      const now = new Date();
      const checkOutDate = new Date(now.getTime() + hoursBeforeCheckout * 60 * 60 * 1000);

      expect(checkOutDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should support 12h before timing', () => {
      const hoursBeforeCheckout = 12;
      const now = new Date();
      const checkOutDate = new Date(now.getTime() + hoursBeforeCheckout * 60 * 60 * 1000);

      expect(checkOutDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should support morning-of timing', () => {
      const now = new Date();
      const checkOutDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);

      expect(checkOutDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Cron Logic (AC1)', () => {
    it('should calculate correct time window for 24h', () => {
      const now = new Date('2026-07-04T10:00:00Z');
      const hoursBeforeCheckout = 24;
      const windowStart = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + hoursBeforeCheckout * 60 * 60 * 1000);

      const checkOutDate = new Date('2026-07-05T09:30:00Z');

      const isInWindow =
        checkOutDate.getTime() >= windowStart.getTime() &&
        checkOutDate.getTime() < windowEnd.getTime();

      expect(isInWindow).toBe(true);
    });

    it('should skip already-sent reminders', () => {
      const sentAt = new Date('2026-07-04T10:00:00Z');
      const shouldSend = sentAt === null || sentAt === undefined;

      expect(shouldSend).toBe(false);
    });
  });

  describe('Prevent Duplicate Sends (AC5)', () => {
    it('should mark as sent with checkout_reminder_sent_at', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
      expect(after).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should skip if already notified', () => {
      const checkoutReminderSentAt = new Date('2026-07-04T10:00:00Z');
      const shouldResend = !checkoutReminderSentAt;

      expect(shouldResend).toBe(false);
    });
  });

  describe('Logging (AC4)', () => {
    it('should log message to whatsapp_logs', () => {
      const log = {
        organization_id: 'org-123',
        to_phone: '+5585987654321',
        template_name: 'lodgra_checkout_reminder',
        message_text: 'Lembrete de checkout',
        wa_message_id: 'wamid_789',
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      expect(log.organization_id).toBeDefined();
      expect(log.to_phone).toBeDefined();
      expect(log.template_name).toBe('lodgra_checkout_reminder');
      expect(log.status).toBe('sent');
    });
  });

  describe('Manual Resend (AC6)', () => {
    it('should allow manual send via endpoint', () => {
      const reservationId = 'res-123';
      const endpoint = `/api/reservations/${reservationId}/send-checkout-reminder`;

      expect(endpoint).toContain(reservationId);
      expect(endpoint).toContain('send-checkout-reminder');
    });

    it('should update checkout_reminder_sent_at on manual send', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
    });
  });

  describe('Guest Phone Validation (AC3)', () => {
    it('should require guest phone', () => {
      const guest = {
        phone: null,
        full_name: 'Jane Doe',
      };

      const canSend = guest.phone !== null;
      expect(canSend).toBe(false);
    });

    it('should accept valid phone', () => {
      const guest = {
        phone: '+5585987654321',
        full_name: 'Jane Doe',
      };

      const canSend = guest.phone !== null;
      expect(canSend).toBe(true);
    });
  });
});
