import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure access token for cleaner authentication
 * Token is UUID4 + random suffix (128-char hex string)
 */
export async function generateAccessToken(): Promise<string> {
  const randomBuffer = randomBytes(64); // 64 bytes = 128 hex chars
  return randomBuffer.toString('hex');
}

/**
 * Hash token with SHA-256 for storage in database
 * Tokens are one-way hashed and cannot be reversed
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token by hashing and comparing
 * Used to check if provided token matches stored hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  return hashToken(token) === hash;
}

export interface TokenVerificationResult {
  valid: boolean;
  cleanerId?: string;
  organizationId?: string;
  error?: string;
}

export interface GenerateTokenPayload {
  cleanerId: string;
  expiresInHours?: number;
}
