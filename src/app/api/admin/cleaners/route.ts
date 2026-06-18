import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    const { full_name, email, phone_number, organization_id, role, guest_type } =
      await request.json();

    if (!full_name || !email || !phone_number || !organization_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      cleaner,
      message: 'Cleaner created successfully',
    });
  } catch (error) {
    console.error('admin/cleaners error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
