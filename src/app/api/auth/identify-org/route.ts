import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { identifyOrgByEmail, validateEmail } from '@/lib/auth/identify-org'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success, reset } = await ratelimit.limit(ip)

    if (!success) {
      const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, retryAfterSeconds)),
          },
        }
      )
    }

    // Parse request body
    const body = await req.json()
    const { email } = body

    // Validate email presence
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Identify organization
    const result = await identifyOrgByEmail(email)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in identify-org endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
