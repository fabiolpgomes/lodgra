/**
 * Story 36.1: Individual discount endpoints
 * PUT/DELETE /api/properties/:id/discounts/:discountId
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { requirePropertyAccess } from '@/lib/auth/requirePropertyAccess';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UpdateDiscountPayload } from '@/types/pricing.types';

// PUT /api/properties/:id/discounts/:discountId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; discountId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, discountId } = await params;
  try {
    const access = await requirePropertyAccess(id, ['admin', 'gestor', 'owner']);
    if (!access.authorized) return access.response;
    const supabase = createAdminClient();

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
    const access = await requirePropertyAccess(id, ['admin', 'gestor', 'owner']);
    if (!access.authorized) return access.response;
    const supabase = createAdminClient();

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
