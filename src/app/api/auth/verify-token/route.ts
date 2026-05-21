import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyTokenHash } from '@/lib/cleaner-tokens';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize rate limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  analytics: true,
});

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from query params
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // 2. Rate limiting by IP
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      '0.0.0.0';

    try {
      const { success, resetAfter } = await ratelimit.limit(
        `verify-token:${clientIp}`
      );

      if (!success) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: resetAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil(resetAfter / 1000).toString(),
            },
          }
        );
      }
    } catch (ratelimitError) {
      // If rate limit check fails, log but allow request to proceed
      console.warn('Rate limit check failed:', ratelimitError);
    }

    // 3. Query token from database
    const supabase = await createClient();
    const { data: tokens, error: queryError } = await supabase
      .from('cleaner_access_tokens')
      .select('id, cleaner_id, token_hash, expires_at, is_used, used_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (queryError) {
      console.error('Token query error:', queryError);
      return NextResponse.json(
        { valid: false, error: 'Token verification failed' },
        { status: 500 }
      );
    }

    // 4. Find matching token (hash comparison)
    let matchedToken = null;
    for (const tokenRecord of tokens || []) {
      if (verifyTokenHash(token, tokenRecord.token_hash)) {
        matchedToken = tokenRecord;
        break;
      }
    }

    if (!matchedToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // 5. Check if token is already used
    if (matchedToken.is_used) {
      return NextResponse.json(
        { valid: false, error: 'Token already used' },
        { status: 401 }
      );
    }

    // 6. Check expiration
    const expiresAt = new Date(matchedToken.expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { valid: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // 7. Get cleaner and organization info
    const { data: cleaner, error: cleanerError } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', matchedToken.cleaner_id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { valid: false, error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    // 8. Mark token as used
    await supabase
      .from('cleaner_access_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        ip_address: clientIp,
        user_agent: request.headers.get('user-agent') || '',
      })
      .eq('id', matchedToken.id);

    // 9. Return success
    return NextResponse.json(
      {
        valid: true,
        cleaner_id: cleaner.id,
        organization_id: cleaner.organization_id,
        token_id: matchedToken.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
