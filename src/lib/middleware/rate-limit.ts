import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'

const RATE_LIMITS: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth\//, limit: 10, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/users/, limit: 20, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/sync\/import/, limit: 5, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/notifications\//, limit: 30, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/api\/stripe\/booking-webhook/, limit: 50, windowMs: 60 * 1000 },
  { pattern: /^\/api\/consent/, limit: 15, windowMs: 60 * 1000 },
  { pattern: /^\/api\/public\//, limit: 30, windowMs: 60 * 1000 },
]

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function applyRateLimit(pathname: string, ip: string): Promise<NextResponse | null> {
  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      if (!checkRateLimit(pathname, ip, rule.limit, rule.windowMs)) {
        return new NextResponse(
          JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        )
      }
      break
    }
  }
  return null
}
