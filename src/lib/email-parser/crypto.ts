import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY_HEX = process.env.EMAIL_PARSE_ENCRYPT_KEY || ''

function getKey(): Buffer {
  const key = (KEY_HEX || '').trim()
  if (!key || key.length < 64) {
    console.error('[crypto] EMAIL_PARSE_ENCRYPT_KEY validation failed:', {
      present: !!key,
      length: key.length,
      value: key.substring(0, 20) + '...'
    })
    throw new Error('EMAIL_PARSE_ENCRYPT_KEY deve ser uma string hex com 64 caracteres (32 bytes)')
  }
  // Parse hex string to Buffer (32 bytes = 64 hex characters)
  return Buffer.from(key.slice(0, 64), 'hex')
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptToken(ciphertext: string): string {
  const [ivHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !encryptedHex) throw new Error('Token encriptado inválido')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
