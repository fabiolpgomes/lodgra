/**
 * Story 36.1: Pricing endpoints
 * GET/POST /api/properties/:id/prices
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PricesPayload, PropertyPrices } from '@/types/pricing.types';

const supabase = await createAdminClient();

async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .single();

  return !!data;
}

// GET /api/properties/:id/prices
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
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
      .from('property_prices')
      .select('*')
      .eq('property_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || { base_price: 0, weekend_price: null },
    });
  } catch (err) {
    console.error('Error fetching prices:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/prices
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
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

    const body: PricesPayload = await req.json();

    // Validation
    if (!body.base_price || body.base_price < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid base_price' },
        { status: 422 }
      );
    }

    if (body.weekend_price && body.weekend_price < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid weekend_price' },
        { status: 422 }
      );
    }

    // Upsert prices
    const { data, error } = await supabase
      .from('property_prices')
      .upsert(
        {
          property_id: id,
          base_price: body.base_price,
          weekend_price: body.weekend_price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error creating/updating prices:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
