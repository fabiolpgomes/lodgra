import { isValidGAId, maskGAId } from '@/lib/analytics/validation';

describe('Analytics Validation', () => {
  describe('isValidGAId', () => {
    it('should accept valid GA IDs', () => {
      expect(isValidGAId('G-1234567890')).toBe(true);
      expect(isValidGAId('G-ABCDEFGHIJ')).toBe(true);
      expect(isValidGAId('G-9876543210')).toBe(true);
    });

    it('should reject lowercase', () => {
      expect(isValidGAId('g-1234567890')).toBe(false);
    });

    it('should reject wrong prefix', () => {
      expect(isValidGAId('GA-1234567890')).toBe(false);
      expect(isValidGAId('G_1234567890')).toBe(false);
    });

    it('should reject wrong length', () => {
      expect(isValidGAId('G-123456789')).toBe(false); // 9 chars
      expect(isValidGAId('G-12345678901')).toBe(false); // 11 chars
    });

    it('should reject invalid characters', () => {
      expect(isValidGAId('G-123456789!')).toBe(false);
      expect(isValidGAId('G-12345678 0')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidGAId('')).toBe(false);
    });
  });

  describe('maskGAId', () => {
    it('should mask GA ID', () => {
      expect(maskGAId('G-1234567890')).toBe('G-●●●●●●●●●●');
    });

    it('should mask with different GA IDs', () => {
      expect(maskGAId('G-ABCDEFGHIJ')).toBe('G-●●●●●●●●●●');
    });

    it('should handle empty string', () => {
      expect(maskGAId('')).toBe('●●●●●●●●●●');
    });

    it('should handle short string', () => {
      expect(maskGAId('G')).toBe('●●●●●●●●●●');
    });
  });
});
