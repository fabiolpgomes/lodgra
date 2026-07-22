/**
 * Story 36.1: Discount endpoints
 * GET/POST /api/properties/:id/discounts
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CreateDiscountPayload, PropertyDiscount } from '@/types/pricing.types';


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

// GET /api/properties/:id/discounts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  try {
    const supabase = await createAdminClient();const {
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
      .from('property_discounts')
      .select('*')
      .eq('property_id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('Error fetching discounts:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/discounts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  try {
    const supabase = await createAdminClient();const {
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

    const body: CreateDiscountPayload = await req.json();

    // Validation
    const validTypes = ['weekly', 'monthly', 'excellent_guest', 'last_minute', 'advance'];
    if (!validTypes.includes(body.discount_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount_type' },
        { status: 422 }
      );
    }

    if (body.percentage < 0 || body.percentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Percentage must be 0-100' },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('property_discounts')
      .insert({
        property_id: id,
        discount_type: body.discount_type,
        percentage: body.percentage,
        min_nights: body.min_nights,
        conditions: body.conditions,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating discount:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
