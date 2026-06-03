import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ANALYTICS_ENCRYPTION_KEY!, 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptGAId(gaId: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(gaId, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  const result = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

  return result;
}

export function decryptGAId(encrypted: Buffer): string {
  const iv = encrypted.slice(0, IV_LENGTH);
  const authTag = encrypted.slice(-AUTH_TAG_LENGTH);
  const ciphertext = encrypted.slice(IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function validateEncryptionKey(): boolean {
  const keyHex = process.env.ANALYTICS_ENCRYPTION_KEY;
  if (!keyHex) {
    console.error('ANALYTICS_ENCRYPTION_KEY not set');
    return false;
  }

  try {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      console.error('ANALYTICS_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Invalid ANALYTICS_ENCRYPTION_KEY format (must be hex)');
    return false;
  }
}
