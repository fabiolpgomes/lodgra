import crypto from 'node:crypto'
import { checkRateLimit } from '@/lib/rateLimit'

const EMAIL_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30
const DEFAULT_EMAIL_DOMAIN = 'lodgra.io'

type EmailTokenPayload = {
  organizationId: string
  customerEmail: string
  iat: number
  exp: number
}

type EmailRateLimitResult =
  | { allowed: true }
  | { allowed: false; status: 429; retryAfter: number; reason: string }

function getEmailTokenSecret(): string {
  return (
    process.env.EMAIL_TOKEN_SECRET ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'dev-email-token-secret'
  )
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getEmailTokenSecret()).update(value).digest('base64url')
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) return false
  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

export function generateUnsubscribeToken(organizationId: string, customerEmail: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: EmailTokenPayload = {
    organizationId,
    customerEmail: customerEmail.toLowerCase(),
    iat: now,
    exp: now + EMAIL_TOKEN_TTL_SECONDS,
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyUnsubscribeToken(
  token: string,
): { valid: true; payload: EmailTokenPayload } | { valid: false; error: string } {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) {
    return { valid: false, error: 'Token inválido' }
  }

  const expectedSignature = sign(encodedPayload)
  if (!timingSafeEqualStrings(signature, expectedSignature)) {
    return { valid: false, error: 'Token inválido' }
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as EmailTokenPayload
    if (
      !payload ||
      typeof payload.organizationId !== 'string' ||
      typeof payload.customerEmail !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return { valid: false, error: 'Token inválido' }
    }

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return { valid: false, error: 'Token expirado' }
    }

    return { valid: true, payload }
  } catch {
    return { valid: false, error: 'Token inválido' }
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function extractDomain(email: string): string | null {
  const parts = normalizeEmail(email).split('@')
  if (parts.length !== 2) return null
  return parts[1] || null
}

function getVerifiedDomainsFromEnv(): Set<string> {
  const raw = process.env.EMAIL_VERIFIED_FROM_DOMAINS ?? process.env.EMAIL_ALLOWED_FROM_DOMAINS ?? ''
  const domains = raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)

  return new Set(domains)
}

export function getVerifiedFromEmail(organizationSlug: string, requestedFromEmail?: string | null): string {
  const safeDomain = `${organizationSlug.toLowerCase()}.${DEFAULT_EMAIL_DOMAIN}`
  const verifiedDomains = getVerifiedDomainsFromEnv()
  const fallback = `noreply@${safeDomain}`

  if (!requestedFromEmail) return fallback

  const normalized = normalizeEmail(requestedFromEmail)
  const domain = extractDomain(normalized)
  if (!domain) return fallback

  if (domain === safeDomain || verifiedDomains.has(domain)) {
    return normalized
  }

  throw new Error(`from_email domain not verified: ${domain}`)
}

export function checkEmailSendRateLimit(
  organizationId: string,
  customerEmail: string,
): EmailRateLimitResult {
  const normalizedEmail = normalizeEmail(customerEmail)

  const burstAllowed = checkRateLimit('email:burst', organizationId, 10, 1000)
  if (!burstAllowed) {
    return {
      allowed: false,
      status: 429,
      retryAfter: 1,
      reason: 'Muitas mensagens enviadas em pouco tempo',
    }
  }

  const orgAllowed = checkRateLimit('email:org-minute', organizationId, 100, 60 * 1000)
  if (!orgAllowed) {
    return {
      allowed: false,
      status: 429,
      retryAfter: 60,
      reason: 'Limite de emails por organização excedido',
    }
  }

  const customerAllowed = checkRateLimit('email:customer-day', normalizedEmail, 5, 24 * 60 * 60 * 1000)
  if (!customerAllowed) {
    return {
      allowed: false,
      status: 429,
      retryAfter: 60 * 60 * 24,
      reason: 'Limite diário para este destinatário excedido',
    }
  }

  return { allowed: true }
}
