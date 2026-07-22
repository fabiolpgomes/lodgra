/**
 * Story 36.1: Individual discount endpoints
 * PUT/DELETE /api/properties/:id/discounts/:discountId
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UpdateDiscountPayload } from '@/types/pricing.types';

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

// PUT /api/properties/:id/discounts/:discountId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; discountId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, discountId } = await params;
  try {
    const supabase = await createAdminClient();
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
      .eq('id', discountId)
      .eq('property_id', id)
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
  { params }: { params: Promise<{ id: string; discountId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, discountId } = await params;
  try {
    const supabase = await createAdminClient();
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

    const { error } = await supabase
      .from('property_discounts')
      .delete()
      .eq('id', discountId)
      .eq('property_id', id);

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
