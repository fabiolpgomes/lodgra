import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'dev-secret-key-change-in-production'
);

interface CleanerSessionPayload {
  sub: string;
  org: string;
  role: 'guest';
  guest_type: 'cleaner';
  name: string;
  iat?: number;
  exp?: number;
}

export async function verifyCleanerSession(
  request: NextRequest
): Promise<{ payload: CleanerSessionPayload; response: null } | { payload: null; response: NextResponse }> {
  try {
    const sessionToken = request.cookies.get('cleaner_session')?.value;

    if (!sessionToken) {
      return {
        payload: null,
        response: NextResponse.redirect(new URL('/cleaner/auth/error?reason=no_session', request.url)),
      };
    }

    const verified = await jwtVerify(sessionToken, JWT_SECRET);
    const payload = verified.payload as unknown as CleanerSessionPayload;

    // Validate payload structure
    if (!payload.sub || payload.guest_type !== 'cleaner') {
      return {
        payload: null,
        response: NextResponse.redirect(new URL('/cleaner/auth/error?reason=invalid_session', request.url)),
      };
    }

    return { payload, response: null };
  } catch (error) {
    console.error('Session verification error:', error);
    return {
      payload: null,
      response: NextResponse.redirect(new URL('/cleaner/auth/error?reason=session_expired', request.url)),
    };
  }
}

export function createCleanerAuthMiddleware(pathname: string) {
  return async (request: NextRequest) => {
    // Allow auth endpoints without session
    if (pathname.startsWith('/cleaner/auth') && !pathname.includes('/dashboard')) {
      return NextResponse.next();
    }

    // Protect dashboard and other routes
    const { payload, response } = await verifyCleanerSession(request);

    if (response) {
      return response;
    }

    // Inject cleaner context into request headers for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Cleaner-ID', payload?.sub || '');
    requestHeaders.set('X-Organization-ID', payload?.org || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  };
}
