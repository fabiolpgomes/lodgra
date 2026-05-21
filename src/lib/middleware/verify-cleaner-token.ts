import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyTokenHash } from '@/lib/cleaner-tokens';

export interface CleanerTokenPayload {
  cleanerId: string;
  organizationId: string;
  tokenId: string;
}

/**
 * Middleware to verify cleaner access token from request
 * Token can be provided as:
 * 1. Query parameter: ?token=xyz
 * 2. Authorization header: Bearer xyz
 * 3. Cookie: cleaner_token=xyz
 */
export async function verifyCleanerToken(
  request: NextRequest
): Promise<{
  valid: boolean;
  payload?: CleanerTokenPayload;
  error?: string;
  status?: number;
}> {
  try {
    // 1. Extract token from request
    const token = extractToken(request);
    if (!token) {
      return { valid: false, error: 'No token provided', status: 401 };
    }

    // 2. Query database for matching token
    const supabase = await createClient();
    const { data: tokens } = await supabase
      .from('cleaner_access_tokens')
      .select('id, cleaner_id, token_hash, expires_at, is_used')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!tokens || tokens.length === 0) {
      return { valid: false, error: 'Invalid token', status: 401 };
    }

    // 3. Find matching token
    let matchedToken = null;
    for (const tokenRecord of tokens) {
      if (verifyTokenHash(token, tokenRecord.token_hash)) {
        matchedToken = tokenRecord;
        break;
      }
    }

    if (!matchedToken) {
      return { valid: false, error: 'Invalid token', status: 401 };
    }

    // 4. Check if used
    if (matchedToken.is_used) {
      return { valid: false, error: 'Token already used', status: 401 };
    }

    // 5. Check expiration
    const expiresAt = new Date(matchedToken.expires_at);
    if (new Date() > expiresAt) {
      return { valid: false, error: 'Token expired', status: 401 };
    }

    // 6. Get cleaner and organization info
    const { data: cleaner } = await supabase
      .from('user_profiles')
      .select('id, organization_id')
      .eq('id', matchedToken.cleaner_id)
      .single();

    if (!cleaner) {
      return { valid: false, error: 'Cleaner not found', status: 404 };
    }

    // 7. Return valid payload
    return {
      valid: true,
      payload: {
        cleanerId: cleaner.id,
        organizationId: cleaner.organization_id,
        tokenId: matchedToken.id,
      },
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, error: 'Token verification failed', status: 500 };
  }
}

/**
 * Extract token from request (query, header, or cookie)
 */
function extractToken(request: NextRequest): string | null {
  // 1. Try query parameter
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get('token');
  if (queryToken) return queryToken;

  // 2. Try Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Try cookie
  const cookieToken = request.cookies.get('cleaner_token')?.value;
  if (cookieToken) return cookieToken;

  return null;
}

/**
 * Middleware wrapper for API routes
 * Usage: wrap API handler with verifyCleanerTokenMiddleware
 */
export function withCleanerTokenAuth(
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
    tokenPayload?: CleanerTokenPayload
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: Record<string, unknown>) => {
    const verification = await verifyCleanerToken(request);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Unauthorized' },
        { status: verification.status || 401 }
      );
    }

    // Call handler with token payload attached to request
    return handler(request, context, verification.payload);
  };
}
