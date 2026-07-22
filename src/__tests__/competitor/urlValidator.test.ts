/**
 * Tests for competitor URL validation (Story 36.10)
 */

import {
  validateCompetitorUrl,
  normalizeUrl,
  getPlatformFromUrl,
  isUrlMonitorable,
  getPlatformDisplayName,
} from '@/lib/competitor/urlValidator';

describe('Competitor URL Validator', () => {
  describe('validateCompetitorUrl', () => {
    it('should validate Airbnb URL', () => {
      const url = 'https://www.airbnb.com/rooms/123456789?title=Beautiful+Apartment';
      const result = validateCompetitorUrl(url);

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('airbnb');
      expect(result.propertyId).toBe('123456789');
    });

    it('should validate Booking.com URL', () => {
      const url = 'https://www.booking.com/hotel/pt/beautiful-apartment.html';
      const result = validateCompetitorUrl(url);

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('booking.com');
    });

    it('should validate VRBO URL', () => {
      const url = 'https://www.vrbo.com/123456';
      const result = validateCompetitorUrl(url);

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('vrbo');
    });

    it('should reject invalid URL', () => {
      const url = 'https://www.example.com/property/123';
      const result = validateCompetitorUrl(url);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject malformed URL', () => {
      const url = 'not a valid url';
      const result = validateCompetitorUrl(url);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle empty URL', () => {
      const result = validateCompetitorUrl('');

      expect(result.isValid).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize Airbnb URL', () => {
      const url = 'https://www.airbnb.com/rooms/123456789?title=Test&utm=campaign';
      const normalized = normalizeUrl(url);

      expect(normalized).toContain('airbnb');
      expect(normalized).toContain('123456789');
    });

    it('should normalize Booking.com URL', () => {
      const url = 'https://www.booking.com/hotel/pt/test-property.html?utm=campaign';
      const normalized = normalizeUrl(url);

      expect(normalized).toContain('booking.com');
    });

    it('should add https protocol if missing', () => {
      const url = 'http://www.airbnb.com/rooms/123456789';
      const normalized = normalizeUrl(url);

      expect(normalized).toMatch(/^https:\/\//);
    });
  });

  describe('getPlatformFromUrl', () => {
    it('should identify Airbnb', () => {
      const platform = getPlatformFromUrl('https://www.airbnb.com/rooms/123');
      expect(platform).toBe('airbnb');
    });

    it('should identify Booking.com', () => {
      const platform = getPlatformFromUrl('https://www.booking.com/hotel/pt/test.html');
      expect(platform).toBe('booking.com');
    });

    it('should identify VRBO', () => {
      const platform = getPlatformFromUrl('https://www.vrbo.com/123456');
      expect(platform).toBe('vrbo');
    });

    it('should return other for unknown platform', () => {
      const platform = getPlatformFromUrl('https://www.example.com/property');
      expect(platform).toBe('other');
    });
  });

  describe('isUrlMonitorable', () => {
    it('should return true for valid URLs', () => {
      expect(isUrlMonitorable('https://www.airbnb.com/rooms/123456789')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isUrlMonitorable('https://www.example.com/property')).toBe(false);
    });
  });

  describe('getPlatformDisplayName', () => {
    it('should return display names', () => {
      expect(getPlatformDisplayName('airbnb')).toBe('Airbnb');
      expect(getPlatformDisplayName('booking.com')).toBe('Booking.com');
      expect(getPlatformDisplayName('vrbo')).toBe('VRBO');
      expect(getPlatformDisplayName('other')).toBe('Other');
    });
  });
});
