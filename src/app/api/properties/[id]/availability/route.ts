/**
 * Story 36.1: Availability endpoints
 * GET/PUT /api/properties/:id/availability
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, AvailabilityPayload, PropertyAvailability } from '@/types/pricing.types';

async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .single();

  return !!data;
}

// GET /api/properties/:id/availability
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  const supabase = createAdminClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isOwner = await validatePropertyOwnership(id, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('property_availability')
      .select('*')
      .eq('property_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || {
        min_nights: 1,
        max_nights: 365,
        advance_notice_days: 0,
        notice_for_same_day: '00:00',
        preparation_days: 0,
      },
    });
  } catch (err) {
    console.error('Error fetching availability:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/properties/:id/availability
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  const supabase = createAdminClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isOwner = await validatePropertyOwnership(id, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body: AvailabilityPayload = await req.json();

    // Validation
    if (body.min_nights && body.min_nights < 1) {
      return NextResponse.json(
        { success: false, error: 'min_nights must be >= 1' },
        { status: 422 }
      );
    }

    if (body.max_nights && body.max_nights < 1) {
      return NextResponse.json(
        { success: false, error: 'max_nights must be >= 1' },
        { status: 422 }
      );
    }

    if (body.min_nights && body.max_nights && body.min_nights > body.max_nights) {
      return NextResponse.json(
        { success: false, error: 'min_nights must be <= max_nights' },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('property_availability')
      .upsert(
        {
          property_id: id,
          ...body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating availability:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
