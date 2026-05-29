import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

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

    // Find the token record
    const { data: tokenRecord, error: tokenError } = await adminClient
      .from('cleaner_access_tokens')
      .select('cleaner_id')
      .eq('token_hash', tokenHash)
      .single();

    if (tokenError || !tokenRecord) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Get cleaner details to find organization
    const { data: cleaner } = await adminClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', tokenRecord.cleaner_id)
      .single();

    if (!cleaner?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get organization branding
    const { data: org } = await adminClient
      .from('organizations')
      .select('name, logo_url')
      .eq('id', cleaner.organization_id)
      .single();

    return NextResponse.json({
      companyName: org?.name || 'Lodgra',
      companyLogo: org?.logo_url || '🏠',
    });
  } catch (error) {
    console.error('Error fetching auth context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
