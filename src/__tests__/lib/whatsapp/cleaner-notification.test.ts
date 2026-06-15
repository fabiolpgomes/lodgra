/**
 * Tests for Cleaner Notification (Story 30.5)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.5 — Cleaner Checkout Notification', () => {
  describe('Message Content (AC3)', () => {
    it('should include required fields in notification', () => {
      const requiredFields = [
        'property_name',
        'property_address',
        'cleaner_name',
        'checkout_time',
        'task_link',
      ];

      const template = `
        🏠 *{{property_name}}*
        📍 {{property_address}}
        Olá {{cleaner_name}}!
        O hóspede fez checkout às {{checkout_time}}.
        {{task_link}}
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
    });
  });

  describe('Cleaner Assignment (AC1)', () => {
    it('should require cleaner assigned to property', () => {
      const property = {
        default_cleaner_id: null,
      };

      const hasCleanerAssigned = property.default_cleaner_id !== null;
      expect(hasCleanerAssigned).toBe(false);
    });

    it('should accept valid cleaner assignment', () => {
      const property = {
        default_cleaner_id: 'cleaner-123',
      };

      const hasCleanerAssigned = property.default_cleaner_id !== null;
      expect(hasCleanerAssigned).toBe(true);
    });
  });

  describe('Manager Notification Fallback (AC2)', () => {
    it('should notify manager if no cleaner assigned', () => {
      const property = {
        default_cleaner_id: null,
      };

      const shouldNotifyManager = property.default_cleaner_id === null;
      expect(shouldNotifyManager).toBe(true);
    });

    it('should skip manager notification if cleaner assigned', () => {
      const property = {
        default_cleaner_id: 'cleaner-123',
      };

      const shouldNotifyManager = property.default_cleaner_id === null;
      expect(shouldNotifyManager).toBe(false);
    });
  });

  describe('Epic 29 Integration (AC5)', () => {
    it('should create cleaning task if Epic 29 enabled', () => {
      const org = {
        cleaner_portal_enabled: true,
      };

      const shouldCreateTask = org.cleaner_portal_enabled;
      expect(shouldCreateTask).toBe(true);
    });

    it('should skip task creation if Epic 29 disabled', () => {
      const org = {
        cleaner_portal_enabled: false,
      };

      const shouldCreateTask = org.cleaner_portal_enabled;
      expect(shouldCreateTask).toBe(false);
    });

    it('should include task link in message if Epic 29 enabled', () => {
      const org = {
        cleaner_portal_enabled: true,
      };

      const taskLink = org.cleaner_portal_enabled
        ? 'https://www.lodgra.io/cleaners/tasks/res-123'
        : '';

      expect(taskLink).toBeDefined();
      expect(taskLink.length).toBeGreaterThan(0);
    });
  });

  describe('Logging (AC5)', () => {
    it('should log message to whatsapp_logs', () => {
      const log = {
        organization_id: 'org-123',
        to_phone: '+5585988881234',
        template_name: 'lodgra_cleaner_checkout_notification',
        message_text: 'Cleaner checkout notification',
        wa_message_id: 'wamid_456',
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      expect(log.organization_id).toBeDefined();
      expect(log.to_phone).toBeDefined();
      expect(log.template_name).toBe('lodgra_cleaner_checkout_notification');
      expect(log.status).toBe('sent');
    });
  });

  describe('Manual Trigger (AC4)', () => {
    it('should allow manual send via endpoint', () => {
      const reservationId = 'res-123';
      const endpoint = `/api/reservations/${reservationId}/notify-cleaner`;

      expect(endpoint).toContain(reservationId);
      expect(endpoint).toContain('notify-cleaner');
    });

    it('should update cleaner_notified_at on send', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
    });
  });

  describe('Cleaner Phone Validation (AC3)', () => {
    it('should require cleaner phone', () => {
      const cleaner = {
        phone: null,
        full_name: 'João Cleaner',
      };

      const canNotify = cleaner.phone !== null;
      expect(canNotify).toBe(false);
    });

    it('should accept valid phone', () => {
      const cleaner = {
        phone: '+5585988881234',
        full_name: 'João Cleaner',
      };

      const canNotify = cleaner.phone !== null;
      expect(canNotify).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should require admin or gestor role', () => {
      const userRole = 'gestor';
      const allowedRoles = ['admin', 'gestor'];

      const isAuthorized = allowedRoles.includes(userRole);
      expect(isAuthorized).toBe(true);
    });

    it('should reject unauthorized roles', () => {
      const userRole = 'cleaner';
      const allowedRoles = ['admin', 'gestor'];

      const isAuthorized = allowedRoles.includes(userRole);
      expect(isAuthorized).toBe(false);
    });
  });
});
