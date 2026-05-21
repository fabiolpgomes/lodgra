import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAccessToken, hashToken } from '@/lib/cleaner-tokens';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate as manager
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, organization_id, guest_type')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Verify manager/admin role
    const isManager = profile.role === 'manager' || profile.role === 'admin';
    if (!isManager) {
      return NextResponse.json(
        { error: 'Only managers can generate access tokens' },
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { cleaner_id, expires_in_hours } = body;

    if (!cleaner_id) {
      return NextResponse.json(
        { error: 'cleaner_id is required' },
        { status: 400 }
      );
    }

    // 5. Verify cleaner exists and belongs to same organization
    const { data: cleaner, error: cleanerError } = await supabase
      .from('user_profiles')
      .select('id, organization_id, guest_type')
      .eq('id', cleaner_id)
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    if (cleaner.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Cleaner must be in same organization' },
        { status: 403 }
      );
    }

    if (cleaner.guest_type !== 'cleaner') {
      return NextResponse.json(
        { error: 'User is not a cleaner' },
        { status: 400 }
      );
    }

    // 6. Get org settings for default expiration
    const { data: orgSettings } = await supabase
      .from('organizations')
      .select('id, metadata')
      .eq('id', profile.organization_id)
      .single();

    const defaultExpiresHours =
      orgSettings?.metadata?.token_expires_hours || 24;
    const finalExpiresHours = expires_in_hours || defaultExpiresHours;

    // 7. Generate token
    const plainToken = await generateAccessToken();
    const tokenHash = hashToken(plainToken);

    // 8. Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + finalExpiresHours);

    // 9. Get client IP
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      '0.0.0.0';

    // 10. Get user agent
    const userAgent = request.headers.get('user-agent') || '';

    // 11. Store token in database
    const { error: insertError } = await supabase
      .from('cleaner_access_tokens')
      .insert({
        cleaner_id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error('Token insertion error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create token' },
        { status: 500 }
      );
    }

    // 12. Return plain token (only shown once)
    return NextResponse.json(
      {
        token: plainToken,
        expires_at: expiresAt.toISOString(),
        expires_in_hours: finalExpiresHours,
        message: 'Token created successfully. Save it now - it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
