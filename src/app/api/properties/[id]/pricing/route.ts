/**
 * Story 37.1: Pricing API Endpoint
 * GET/PUT /api/properties/[id]/pricing
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PricingConfig, PricesPayload } from '@/types/pricing.types';

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

// GET /api/properties/:id/pricing
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  const supabase = await createAdminClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

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
      .from('property_prices')
      .select('*')
      .eq('property_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || {
        property_id: id,
        base_price: 0,
        weekend_price: null,
      },
    });
  } catch (err) {
    console.error('Error fetching pricing:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/properties/:id/pricing
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  const supabase = await createAdminClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

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

    const body: PricesPayload = await req.json();

    // Validation
    if (body.base_price === undefined || body.base_price < 1) {
      return NextResponse.json(
        { success: false, error: 'base_price must be >= 1' },
        { status: 422 }
      );
    }

    if (body.weekend_price !== undefined && body.weekend_price !== null && body.weekend_price < body.base_price) {
      return NextResponse.json(
        { success: false, error: 'weekend_price must be >= base_price' },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('property_prices')
      .upsert(
        {
          property_id: id,
          base_price: body.base_price,
          weekend_price: body.weekend_price || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating pricing:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
