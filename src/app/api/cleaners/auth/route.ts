import { createAdminClient } from '@/lib/supabase/admin';
import { SignJWT } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || 'dev-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Hash token to match stored token_hash
    const { hashToken } = await import('@/lib/cleaner-tokens');
    const tokenHash = hashToken(token);

    // Validate token in cleaner_access_tokens
    const { data: tokenRecord, error: tokenError } = await adminClient
      .from('cleaner_access_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    // Check if token is revoked
    if (tokenRecord.revoked_at) {
      return NextResponse.json(
        { error: 'Token has been revoked' },
        { status: 401 }
      );
    }

    // Mark token as used
    await adminClient
      .from('cleaner_access_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Get cleaner details
    const { data: cleaner, error: cleanerError } = await adminClient
      .from('user_profiles')
      .select('id, organization_id, full_name')
      .eq('id', tokenRecord.cleaner_id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    // Create JWT session token (8h expiry)
    const sessionToken = await new SignJWT({
      sub: cleaner.id,
      org: cleaner.organization_id,
      role: 'guest',
      guest_type: 'cleaner',
      name: cleaner.full_name,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('cleaner_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/cleaner',
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      redirectUrl: '/cleaner/dashboard',
      sessionToken,
    });
  } catch (error) {
    console.error('auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
