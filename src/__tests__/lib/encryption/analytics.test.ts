import { encryptGAId, decryptGAId, validateEncryptionKey } from '@/lib/encryption/analytics';

describe('Analytics Encryption', () => {
  const testGAId = 'G-1234567890';

  beforeAll(() => {
    // Validate encryption key is set
    if (!validateEncryptionKey()) {
      throw new Error('ANALYTICS_ENCRYPTION_KEY not properly set for tests');
    }
  });

  describe('encryptGAId', () => {
    it('should encrypt GA ID', () => {
      const encrypted = encryptGAId(testGAId);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const encrypted1 = encryptGAId(testGAId);
      const encrypted2 = encryptGAId(testGAId);
      expect(encrypted1).not.toEqual(encrypted2);
    });

    it('should encrypt different GA IDs to different ciphertexts', () => {
      const encrypted1 = encryptGAId('G-1111111111');
      const encrypted2 = encryptGAId('G-2222222222');
      expect(encrypted1).not.toEqual(encrypted2);
    });
  });

  describe('decryptGAId', () => {
    it('should decrypt encrypted GA ID', () => {
      const encryptedBase64 = encryptGAId(testGAId);
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      const decrypted = decryptGAId(encrypted);
      expect(decrypted).toBe(testGAId);
    });

    it('should handle round-trip encryption/decryption', () => {
      const original = 'G-ABCDEFGHIJ';
      const encryptedBase64 = encryptGAId(original);
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      const decrypted = decryptGAId(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should throw error on malformed ciphertext', () => {
      const badCiphertext = Buffer.from('invalid-data');
      expect(() => decryptGAId(badCiphertext)).toThrow();
    });

    it('should throw error on tampered auth tag', () => {
      const encryptedBase64 = encryptGAId(testGAId);
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      // Tamper with last byte (auth tag)
      encrypted[encrypted.length - 1] ^= 0xff;
      expect(() => decryptGAId(encrypted)).toThrow();
    });
  });

  describe('validateEncryptionKey', () => {
    it('should validate correct encryption key format', () => {
      const result = validateEncryptionKey();
      expect(result).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should not expose plaintext in encrypted buffer', () => {
      const encryptedBase64 = encryptGAId(testGAId);
      const encrypted = Buffer.from(encryptedBase64, 'base64');
      const encryptedHex = encrypted.toString('hex');
      expect(encryptedHex).not.toContain(testGAId);
    });

    it('should maintain encryption strength', () => {
      // Encrypt multiple times, all should be different
      const encryptions = new Set();
      for (let i = 0; i < 100; i++) {
        const encryptedBase64 = encryptGAId(testGAId);
        const encrypted = Buffer.from(encryptedBase64, 'base64');
        encryptions.add(encrypted.toString('hex'));
      }
      // All 100 encryptions should be unique
      expect(encryptions.size).toBe(100);
    });
  });
});
