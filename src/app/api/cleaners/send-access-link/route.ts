import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Mock WhatsApp service (Story 30.1 will replace with real implementation)
async function sendWhatsAppMessage(phoneNumber: string, cleanerName: string, accessLink: string) {
  console.log(`[MOCK WhatsApp] Sending to ${phoneNumber}:`);
  console.log(`  Message: Olá ${cleanerName}! Acesse suas tarefas: ${accessLink}`);

  // TODO: Replace with actual WhatsApp Cloud API call (Story 30.1)
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { cleanerId, organizationId } = await request.json();

    if (!cleanerId || !organizationId) {
      return NextResponse.json(
        { error: 'cleanerId and organizationId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // Get cleaner details
    const { data: cleaner, error: cleanerError } = await supabase
      .from('user_profiles')
      .select('id, full_name, phone_number')
      .eq('id', cleanerId)
      .eq('organization_id', organizationId)
      .eq('guest_type', 'cleaner')
      .single();

    if (cleanerError || !cleaner) {
      return NextResponse.json(
        { error: 'Cleaner not found' },
        { status: 404 }
      );
    }

    // Generate token: 32 bytes hex = 256 bits entropy
    const plainToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
    const { hashToken } = await import('@/lib/cleaner-tokens');
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Store token hash in cleaner_access_tokens
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('cleaner_access_tokens')
      .insert({
        cleaner_id: cleanerId,
        organization_id: organizationId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used_at: null,
        revoked_at: null,
      })
      .select()
      .single();

    if (tokenError) {
      console.error('Token creation error:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate access token' },
        { status: 500 }
      );
    }

    // Build access link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.lodgra.io';
    const accessLink = `${appUrl}/cleaner/auth?token=${plainToken}`;

    // Send WhatsApp message (mock for now, real API in Story 30.1)
    await sendWhatsAppMessage(
      cleaner.phone_number || '+351XXX',
      cleaner.full_name,
      accessLink
    );

    return NextResponse.json({
      success: true,
      message: 'Access link sent successfully',
      tokenId: tokenRecord.id,
      expiresAt: tokenRecord.expires_at,
    });
  } catch (error) {
    console.error('send-access-link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
