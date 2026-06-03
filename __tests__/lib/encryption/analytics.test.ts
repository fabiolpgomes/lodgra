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
      expect(encrypted).toBeInstanceOf(Buffer);
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
      const encrypted = encryptGAId(testGAId);
      const decrypted = decryptGAId(encrypted);
      expect(decrypted).toBe(testGAId);
    });

    it('should handle round-trip encryption/decryption', () => {
      const original = 'G-ABCDEFGHIJ';
      const encrypted = encryptGAId(original);
      const decrypted = decryptGAId(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should throw error on malformed ciphertext', () => {
      const badCiphertext = Buffer.from('invalid-data');
      expect(() => decryptGAId(badCiphertext)).toThrow();
    });

    it('should throw error on tampered auth tag', () => {
      const encrypted = encryptGAId(testGAId);
      // Tamper with last byte (auth tag)
      encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1] ^ 0xff;
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
      const encrypted = encryptGAId(testGAId);
      const encryptedString = encrypted.toString('hex');
      expect(encryptedString).not.toContain(testGAId);
    });

    it('should maintain encryption strength', () => {
      // Encrypt multiple times, all should be different
      const encryptions = new Set();
      for (let i = 0; i < 100; i++) {
        encryptions.add(encryptGAId(testGAId).toString('hex'));
      }
      // All 100 encryptions should be unique
      expect(encryptions.size).toBe(100);
    });
  });
});
