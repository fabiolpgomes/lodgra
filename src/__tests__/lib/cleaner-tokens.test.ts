import {
  generateAccessToken,
  hashToken,
  verifyTokenHash,
} from '@/lib/cleaner-tokens';

describe('Cleaner Token Functions', () => {
  describe('generateAccessToken', () => {
    it('should generate a 128-character hex string', async () => {
      const token = await generateAccessToken();
      expect(token).toMatch(/^[a-f0-9]{128}$/);
    });

    it('should generate unique tokens', async () => {
      const token1 = await generateAccessToken();
      const token2 = await generateAccessToken();
      expect(token1).not.toBe(token2);
    });

    it('should always return 128 characters', async () => {
      for (let i = 0; i < 10; i++) {
        const token = await generateAccessToken();
        expect(token.length).toBe(128);
      }
    });
  });

  describe('hashToken', () => {
    it('should produce a 64-character SHA-256 hex string', () => {
      const token = 'test-token-abc123';
      const hash = hashToken(token);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be consistent for same input', () => {
      const token = 'test-token-abc123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should differ for different inputs', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should not be reversible', () => {
      const token = 'secret-token';
      const hash = hashToken(token);
      // Hash should never equal the original token
      expect(hash).not.toEqual(token);
    });
  });

  describe('verifyTokenHash', () => {
    it('should return true for matching token and hash', async () => {
      const token = await generateAccessToken();
      const hash = hashToken(token);
      expect(verifyTokenHash(token, hash)).toBe(true);
    });

    it('should return false for non-matching token and hash', async () => {
      const token1 = await generateAccessToken();
      const token2 = await generateAccessToken();
      const hash = hashToken(token1);
      expect(verifyTokenHash(token2, hash)).toBe(false);
    });

    it('should handle case sensitivity', () => {
      const token = 'Test-Token-123';
      const hash = hashToken(token);
      // Different case should not match
      expect(verifyTokenHash('test-token-123', hash)).toBe(false);
    });
  });

  describe('Token Security', () => {
    it('should not expose token in hash', async () => {
      const token = await generateAccessToken();
      const hash = hashToken(token);
      // The hash should not contain the original token
      expect(hash).not.toContain(token.substring(0, 10));
    });

    it('should generate cryptographically random tokens', async () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        const token = await generateAccessToken();
        tokens.add(token);
      }
      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });
});
