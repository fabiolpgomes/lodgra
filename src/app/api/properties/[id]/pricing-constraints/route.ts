/**
 * Story 36.6: Pricing Constraints endpoints
 * GET/POST /api/properties/:id/pricing-constraints
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PricingConstraintsPayload, PropertyPricingConstraints } from '@/types/pricing.types';
import { PricingCalculator } from '@/lib/pricing/pricing-calculator';

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

// GET /api/properties/:id/pricing-constraints
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
      .select('min_nightly_price, max_nightly_price')
      .eq('property_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const constraints: PropertyPricingConstraints = {
      property_id: id,
      min_nightly_price: data?.min_nightly_price ?? null,
      max_nightly_price: data?.max_nightly_price ?? null,
    };

    return NextResponse.json({
      success: true,
      data: constraints,
    });
  } catch (err) {
    console.error('Error fetching pricing constraints:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/pricing-constraints
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

    const body: PricingConstraintsPayload = await req.json();

    // Validate constraints
    const validation = PricingCalculator.validatePriceRange(
      body.min_nightly_price,
      body.max_nightly_price
    );

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 422 }
      );
    }

    // Upsert constraints
    const { data, error } = await supabase
      .from('property_prices')
      .upsert(
        {
          property_id: id,
          min_nightly_price: body.min_nightly_price ?? null,
          max_nightly_price: body.max_nightly_price ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id' }
      )
      .select('min_nightly_price, max_nightly_price')
      .single();

    if (error) throw error;

    const constraints: PropertyPricingConstraints = {
      property_id: id,
      min_nightly_price: data?.min_nightly_price ?? null,
      max_nightly_price: data?.max_nightly_price ?? null,
    };

    return NextResponse.json(
      { success: true, data: constraints },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error updating pricing constraints:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
