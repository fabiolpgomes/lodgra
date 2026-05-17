import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

// Story 12.4: Webhook and Billing rate limits with Upstash/Redis support
const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\//, limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/users/, limit: 20, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/sync\/import/, limit: 5, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/notifications\//, limit: 30, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/stripe\/booking-webhook/, limit: 50, windowMs: 60 * 1000 },
  { pattern: /^\/api\/consent/, limit: 15, windowMs: 60 * 1000 },
  { pattern: /^\/api\/public\//, limit: 30, windowMs: 60 * 1000 },
  // Story 12.4: Stripe Webhook endpoints - 10 req/min per IP
  { pattern: /^\/api\/stripe\/webhooks\//, limit: 10, windowMs: 60 * 1000 },
  // Story 12.4: Billing endpoints - 5 req/min per user
  { pattern: /^\/api\/billing\//, limit: 5, windowMs: 60 * 1000 },
]

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    return null
  } catch {
    return null
  }
}

export async function applyRateLimit(pathname: string, ip: string): Promise<NextResponse | null> {
  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      if (!checkRateLimit(pathname, ip, rule.limit, rule.windowMs)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil(rule.windowMs / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(rule.windowMs / 1000).toString(),
              'X-RateLimit-Limit': rule.limit.toString(),
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
      break
    }
  }
  return null
}

/**
 * Story 12.4: Specific webhook rate limit check
 * Limits webhook endpoints to 10 requests per minute by IP
 */
export async function checkWebhookRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const limit = 10
  const windowMs = 60 * 1000
  const allowed = checkRateLimit(`/api/stripe/webhooks`, ip, limit, windowMs)

  return {
    allowed,
    remaining: allowed ? limit - 1 : 0,
    reset: Date.now() + windowMs,
  }
}

/**
 * Story 12.4: Specific billing rate limit check
 * Limits billing endpoints to 5 requests per minute per user
 */
export async function checkBillingRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const limit = 5
  const windowMs = 60 * 1000
  const allowed = checkRateLimit(`/api/billing`, identifier, limit, windowMs)

  return {
    allowed,
    remaining: allowed ? limit - 1 : 0,
    reset: Date.now() + windowMs,
  }
}
