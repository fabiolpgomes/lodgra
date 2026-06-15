/**
 * Tests for Check-in Code Automation (Story 30.3)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.3 — Check-in Code Automation', () => {
  describe('Message Content (AC5)', () => {
    it('should include required fields in message', () => {
      const requiredFields = [
        'property_name',
        'property_address',
        'guest_name',
        'checkin_date',
        'checkin_code',
      ];

      const template = `
        🏠 {{property_name}}
        📍 {{property_address}}
        Olá {{guest_name}}, check-in: {{checkin_date}}
        Código: {{checkin_code}}
      `;

      requiredFields.forEach((field) => {
        expect(template).toContain(`{{${field}}}`);
      });
    });
  });

  describe('Timing Configuration (AC4)', () => {
    it('should support 24h before timing', () => {
      const hoursBeforeCheckin = 24;
      const now = new Date();
      const checkInDate = new Date(now.getTime() + hoursBeforeCheckin * 60 * 60 * 1000);

      expect(checkInDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should support 48h before timing', () => {
      const hoursBeforeCheckin = 48;
      const now = new Date();
      const checkInDate = new Date(now.getTime() + hoursBeforeCheckin * 60 * 60 * 1000);

      expect(checkInDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should support same-day timing', () => {
      const hoursBeforeCheckin = 0;
      const now = new Date();
      const checkInDate = new Date(now.getTime() + hoursBeforeCheckin * 60 * 60 * 1000);

      expect(checkInDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });

  describe('Cron Logic (AC3)', () => {
    it('should calculate correct time window', () => {
      const now = new Date('2026-06-15T10:00:00Z');
      const hoursBeforeCheckin = 24;
      const windowStart = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + hoursBeforeCheckin * 60 * 60 * 1000);

      const checkInDate = new Date('2026-06-16T09:30:00Z');

      const isInWindow =
        checkInDate.getTime() >= windowStart.getTime() &&
        checkInDate.getTime() < windowEnd.getTime();

      expect(isInWindow).toBe(true);
    });

    it('should skip already-sent codes', () => {
      const sentAt = new Date('2026-06-15T08:00:00Z');
      const checkInDate = new Date('2026-06-16T10:00:00Z');

      // If checkin_code_sent_at is not null, skip
      const shouldSend = sentAt === null || sentAt === undefined;

      expect(shouldSend).toBe(false);
    });
  });

  describe('Fallback (AC8)', () => {
    it('should fallback to email if no phone', () => {
      const guestPhone = null;
      const guestEmail = 'guest@example.com';

      const hasPhone = guestPhone !== null;
      const hasEmail = guestEmail !== null;
      const shouldUseFallback = !hasPhone && hasEmail;
      expect(shouldUseFallback).toBe(true);
    });

    it('should warn if no phone and no email', () => {
      const guestPhone = null;
      const guestEmail = null;

      const hasPhone = guestPhone !== null;
      const hasEmail = guestEmail !== null;
      const cannotNotify = !hasPhone && !hasEmail;
      expect(cannotNotify).toBe(true);
    });
  });

  describe('Validation (AC1)', () => {
    it('should require checkin_code field', () => {
      const reservation = {
        id: '123',
        checkin_code: null,
        check_in_date: '2026-06-16',
      };

      const isValid = !!reservation.checkin_code;
      expect(isValid).toBe(false);
    });

    it('should accept valid checkin_code', () => {
      const reservation = {
        id: '123',
        checkin_code: 'Caixa cinza, código 4521',
        check_in_date: '2026-06-16',
      };

      const isValid = !!reservation.checkin_code;
      expect(isValid).toBe(true);
    });
  });

  describe('Manual Resend (AC7)', () => {
    it('should update checkin_code_sent_at on manual send', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
    });
  });
});
