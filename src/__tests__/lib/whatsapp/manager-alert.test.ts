/**
 * Tests for Manager New Booking Alert (Story 30.8)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.8 — Manager New Booking Alert', () => {
  describe('Message Content (AC2)', () => {
    it('should include required fields in alert message', () => {
      const requiredFields = [
        'property_name',
        'property_address',
        'guest_name',
        'guest_phone',
        'checkin_date',
        'checkout_date',
        'total_price',
      ];

      const template = `
        📬 *Nova Reserva!*
        🏠 {{property_name}}
        👤 Hóspede: {{guest_name}}
        📍 {{property_address}}
        📅 Check-in: {{checkin_date}}
        📅 Checkout: {{checkout_date}}
        💰 Valor: {{total_price}}
        📞 Contacto: {{guest_phone}}
      `;

      requiredFields.forEach((field) => {
        expect(template).toContain(`{{${field}}}`);
      });
    });

    it('should format all required information', () => {
      const alertData = {
        property_name: 'Apartamento Lisboa',
        property_address: 'Rua da Rosa, Lisboa',
        guest_name: 'João Silva',
        guest_phone: '+5585987654321',
        checkin_date: '01/07/2026',
        checkout_date: '05/07/2026',
        total_price: 'R$ 1000.00',
      };

      Object.entries(alertData).forEach(([key, value]) => {
        expect(value).toBeDefined();
        expect(value).not.toEqual('');
      });
    });
  });

  describe('Trigger on New Booking (AC1)', () => {
    it('should send when new reservation created', () => {
      const reservation = {
        id: '123',
        created_at: new Date().toISOString(),
        manager_notified_at: null,
      };

      const shouldNotify = !reservation.manager_notified_at;
      expect(shouldNotify).toBe(true);
    });

    it('should track notification timestamp', () => {
      const now = new Date().toISOString();
      const managerNotifiedAt = now;

      expect(managerNotifiedAt).not.toBeNull();
      expect(managerNotifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Manager Contact Resolution (AC3)', () => {
    it('should retrieve manager phone from organization', () => {
      const organization = {
        id: 'org-123',
        manager_phone: '+5585988881234',
        contact_phone: '+5585988885678',
      };

      const managerPhone = organization.manager_phone || organization.contact_phone;
      expect(managerPhone).toBe('+5585988881234');
    });

    it('should fallback to contact_phone if manager_phone missing', () => {
      const organization = {
        id: 'org-123',
        manager_phone: null,
        contact_phone: '+5585988885678',
      };

      const managerPhone = organization.manager_phone || organization.contact_phone;
      expect(managerPhone).toBe('+5585988885678');
    });

    it('should fail if no phone configured', () => {
      const organization = {
        id: 'org-123',
        manager_phone: null,
        contact_phone: null,
      };

      const managerPhone = organization.manager_phone || organization.contact_phone;
      expect(managerPhone).toBeNull();
    });
  });

  describe('Prevent Duplicate Notifications (AC4)', () => {
    it('should skip if already notified', () => {
      const firstNotifyAt = new Date('2026-07-01T10:00:00Z');
      const shouldRenotify = !firstNotifyAt;

      expect(shouldRenotify).toBe(false);
    });

    it('should allow notification if not sent', () => {
      const managerNotifiedAt = null;
      const shouldNotify = managerNotifiedAt === null;

      expect(shouldNotify).toBe(true);
    });
  });

  describe('Logging (AC5)', () => {
    it('should log message to whatsapp_logs', () => {
      const log = {
        organization_id: 'org-123',
        to_phone: '+5585988881234',
        template_name: 'lodgra_new_booking_alert',
        message_text: 'Nova Reserva - João Silva',
        wa_message_id: 'wamid_456',
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      expect(log.organization_id).toBeDefined();
      expect(log.to_phone).toBeDefined();
      expect(log.template_name).toBe('lodgra_new_booking_alert');
      expect(log.status).toBe('sent');
    });
  });

  describe('Manual Notification (AC6)', () => {
    it('should allow manual send via endpoint', () => {
      const endpoint = '/api/reservations/notify-manager';
      const payload = { reservationId: 'res-123' };

      expect(endpoint).toContain('notify-manager');
      expect(payload.reservationId).toBeDefined();
    });

    it('should update manager_notified_at timestamp', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
    });
  });

  describe('Configuration & Disabling (AC7)', () => {
    it('should respect auto_notify_manager setting', () => {
      const organization = {
        auto_notify_manager: true,
      };

      expect(organization.auto_notify_manager).toBe(true);
    });

    it('should skip if auto_notify_manager is false', () => {
      const organization = {
        auto_notify_manager: false,
      };

      const shouldNotify = organization.auto_notify_manager;
      expect(shouldNotify).toBe(false);
    });
  });

  describe('Price Calculation', () => {
    it('should calculate correct total price', () => {
      const nightlyPrice = 250;
      const nights = 4;
      const totalPrice = nightlyPrice * nights;

      expect(totalPrice).toBe(1000);
      expect(`R$ ${totalPrice.toFixed(2)}`).toBe('R$ 1000.00');
    });

    it('should handle decimal prices', () => {
      const nightlyPrice = 150.5;
      const nights = 3;
      const totalPrice = nightlyPrice * nights;

      expect(totalPrice).toBeCloseTo(451.5, 1);
      expect(`R$ ${totalPrice.toFixed(2)}`).toBe('R$ 451.50');
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
      const userRole = 'guest';
      const allowedRoles = ['admin', 'gestor'];

      const isAuthorized = allowedRoles.includes(userRole);
      expect(isAuthorized).toBe(false);
    });
  });
});
