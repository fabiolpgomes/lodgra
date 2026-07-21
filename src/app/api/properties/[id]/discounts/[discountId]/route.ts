/**
 * Story 36.1: Individual discount endpoints
 * PUT/DELETE /api/properties/:id/discounts/:discountId
 */

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UpdateDiscountPayload } from '@/types/pricing.types';

const supabase = createRouteHandlerClient({ cookies });

async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .single();

  return !!data;
}

// PUT /api/properties/:id/discounts/:discountId
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; discountId: string } }
): Promise<NextResponse<ApiResponse>> {
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

    const isOwner = await validatePropertyOwnership(params.id, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body: UpdateDiscountPayload = await req.json();

    // Validation
    if (body.percentage && (body.percentage < 0 || body.percentage > 100)) {
      return NextResponse.json(
        { success: false, error: 'Percentage must be 0-100' },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('property_discounts')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.discountId)
      .eq('property_id', params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Discount not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating discount:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/:id/discounts/:discountId
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; discountId: string } }
): Promise<NextResponse<ApiResponse>> {
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

    const isOwner = await validatePropertyOwnership(params.id, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('property_discounts')
      .delete()
      .eq('id', params.discountId)
      .eq('property_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Error deleting discount:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
