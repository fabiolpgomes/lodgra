import { createAdminClient } from '@/lib/supabase/admin'
import { sendCleanerNotification, CLEANER_MESSAGE_TEMPLATES } from '@/lib/whatsapp/send-cleaner-notification'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const { full_name, email, phone_number, organization_id, role, guest_type, send_welcome_message } =
      await request.json();

    if (!full_name || !email || !phone_number || !organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields: full_name, email, phone_number, organization_id' },
        { status: 400 }
      );
    }

    // Validate phone number format (international format with +)
    if (!phone_number.match(/^\+?[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format: +351912345678' },
        { status: 400 }
      );
    }

    // Get organization info for messages
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, metadata')
      .eq('id', organization_id)
      .single()

    // Create user profile as guest/cleaner
    const { data: cleaner, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        full_name,
        email,
        phone_number,
        organization_id,
        role: role || 'guest',
        guest_type: guest_type || 'cleaner',
        accepts_whatsapp: true, // Enable WhatsApp by default for cleaners
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('Cleaner creation error:', createError);
      return NextResponse.json(
        { error: 'Failed to create cleaner' },
        { status: 500 }
      );
    }

    // Send welcome message if requested and WhatsApp is enabled
    if (send_welcome_message !== false && orgData?.metadata?.whatsapp_enabled) {
      const welcomeMessage = CLEANER_MESSAGE_TEMPLATES.welcome(
        full_name,
        orgData?.name || 'nossa organização'
      )

      const messageResult = await sendCleanerNotification({
        cleanerId: cleaner.id,
        organizationId: organization_id,
        message: welcomeMessage,
        templateName: 'welcome',
      })

      if (!messageResult.success) {
        console.warn('Failed to send welcome message:', messageResult.error)
        // Don't fail creation if message fails - cleaner still created
      }
    }

    return NextResponse.json({
      success: true,
      cleaner,
      message: 'Cleaner created successfully',
      whatsapp_message_sent: send_welcome_message !== false,
    });
  } catch (error) {
    console.error('admin/cleaners error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
