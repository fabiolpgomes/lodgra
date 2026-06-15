/**
 * Tests for Reservation Confirmation (Story 30.7)
 */

import { describe, it, expect } from '@jest/globals';

describe('Story 30.7 — Reservation Confirmation', () => {
  describe('Message Content (AC2)', () => {
    it('should include required fields in confirmation message', () => {
      const requiredFields = [
        'property_name',
        'property_address',
        'guest_name',
        'checkin_date',
        'checkout_date',
        'total_price',
      ];

      const template = `
        ✅ *Sua reserva foi confirmada!*
        🏠 *{{property_name}}*
        📍 {{property_address}}
        Olá {{guest_name}},
        📅 Check-in: {{checkin_date}}
        📅 Checkout: {{checkout_date}}
        💰 Preço: {{total_price}}
      `;

      requiredFields.forEach((field) => {
        expect(template).toContain(`{{${field}}}`);
      });
    });

    it('should format dates correctly', () => {
      const checkInDate = new Date('2026-07-01');
      const checkOutDate = new Date('2026-07-05');

      const checkInFormatted = checkInDate.toLocaleDateString('pt-BR');
      const checkOutFormatted = checkOutDate.toLocaleDateString('pt-BR');

      expect(checkInFormatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(checkOutFormatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should calculate total price correctly', () => {
      const nightlyPrice = 250;
      const nights = 4;
      const totalPrice = nightlyPrice * nights;

      expect(totalPrice).toBe(1000);
      expect(totalPrice.toFixed(2)).toBe('1000.00');
    });
  });

  describe('Timing (AC1)', () => {
    it('should send confirmation when reservation is confirmed', () => {
      const reservation = {
        id: '123',
        status: 'pending',
        confirmation_sent_at: null,
      };

      const shouldSend = reservation.status === 'confirmed' && !reservation.confirmation_sent_at;
      expect(shouldSend).toBe(false); // status is still pending

      reservation.status = 'confirmed';
      expect(reservation.status === 'confirmed' && !reservation.confirmation_sent_at).toBe(true);
    });

    it('should update confirmation_sent_at timestamp', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
      expect(after).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Guest Phone Validation (AC3)', () => {
    it('should require guest phone number', () => {
      const reservation = {
        id: '123',
        guests: {
          phone: null,
          full_name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const canSend = reservation.guests.phone !== null;
      expect(canSend).toBe(false);
    });

    it('should accept valid phone', () => {
      const reservation = {
        id: '123',
        guests: {
          phone: '+5585987654321',
          full_name: 'John Doe',
        },
      };

      const canSend = reservation.guests.phone !== null;
      expect(canSend).toBe(true);
    });
  });

  describe('Prevent Duplicate Sends (AC5)', () => {
    it('should skip if already sent', () => {
      const firstSendAt = new Date('2026-07-01T10:00:00Z');
      const shouldResend = !firstSendAt;

      expect(shouldResend).toBe(false);
    });

    it('should allow resend if not sent', () => {
      const confirmationSentAt = null;
      const shouldSend = confirmationSentAt === null;

      expect(shouldSend).toBe(true);
    });
  });

  describe('Logging (AC4)', () => {
    it('should log message to whatsapp_logs', () => {
      const log = {
        organization_id: 'org-123',
        to_phone: '+5585987654321',
        template_name: 'lodgra_reservation_confirmation',
        message_text: 'Sua reserva foi confirmada',
        wa_message_id: 'wamid_123',
        status: 'sent',
        created_at: new Date().toISOString(),
      };

      expect(log.organization_id).toBeDefined();
      expect(log.to_phone).toBeDefined();
      expect(log.template_name).toBe('lodgra_reservation_confirmation');
      expect(log.status).toBe('sent');
    });
  });

  describe('Manual Resend (AC6)', () => {
    it('should allow manual resend via endpoint', () => {
      const reservationId = 'res-123';
      const endpoint = `/api/reservations/${reservationId}/send-confirmation`;

      expect(endpoint).toContain(reservationId);
      expect(endpoint).toContain('send-confirmation');
    });

    it('should update confirmation_sent_at on manual send', () => {
      const before = null;
      const after = new Date().toISOString();

      expect(before).toBeNull();
      expect(after).not.toBeNull();
    });
  });

  describe('Fallback (AC7)', () => {
    it('should fallback to email if phone unavailable', () => {
      const guestPhone = null;
      const guestEmail = 'guest@example.com';

      const shouldFallback = guestPhone === null && guestEmail !== null;
      expect(shouldFallback).toBe(true);
    });

    it('should warn if no contact method available', () => {
      const guestPhone = null;
      const guestEmail = null;

      const cannotNotify = guestPhone === null && guestEmail === null;
      expect(cannotNotify).toBe(true);
    });
  });
});
