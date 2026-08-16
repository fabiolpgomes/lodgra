/**
 * Story 36.1: Discount endpoints
 * GET/POST /api/properties/:id/discounts
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, CreateDiscountPayload, PropertyDiscount } from '@/types/pricing.types';

function isMissingDiscountsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const details = error as { code?: string; message?: string; details?: string };
  const text = `${details.message ?? ''} ${details.details ?? ''}`.toLowerCase();

  return (
    details.code === '42P01' ||
    details.code === 'PGRST205' ||
    text.includes('property_discounts') ||
    text.includes('relation') && text.includes('does not exist')
  );
}


async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('properties')
    .select('id, owners(id, user_id)')
    .eq('id', propertyId)
    .single();

  if (!data) return false;
  const owners = Array.isArray(data.owners) ? data.owners[0] : data.owners;
  return owners?.user_id === userId;
}

// GET /api/properties/:id/discounts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
  try {
    const supabase = await createClient();
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
      .from('property_discounts')
      .select('*')
      .eq('property_id', id);

    // Handle missing table gracefully (table was dropped in schema rollback)
    if (error) {
      console.warn('[Discounts] Error:', {
        code: error.code,
        message: error.message,
        details: (error as any).details,
      });

      // Check if table doesn't exist (multiple ways it can be reported)
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('property_discounts') ||
        (error as any).details?.includes('relation')
      ) {
        console.warn('Discounts table does not exist - returning empty array');
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('[Discounts] Exception:', err);
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
    const supabase = await createClient();
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

    const body = (await req.json()) as Partial<CreateDiscountPayload> & {
      weeklyPercent?: number;
      monthlyPercent?: number;
      loyaltyPercent?: number;
    };
    const validTypes = ['weekly', 'monthly', 'excellent_guest', 'last_minute', 'advance'];

    // The calendar card saves its three editable discount tiers together.
    // Keep the endpoint backwards compatible with the single-discount hook.
    const batch = [
      { discount_type: 'weekly', percentage: body.weeklyPercent, min_nights: 7 },
      { discount_type: 'monthly', percentage: body.monthlyPercent, min_nights: 28 },
      { discount_type: 'excellent_guest', percentage: body.loyaltyPercent, min_nights: undefined },
    ];
    const discounts = body.discount_type
      ? [{ discount_type: body.discount_type, percentage: body.percentage, min_nights: body.min_nights }]
      : batch;

    if (body.discount_type && !validTypes.includes(body.discount_type)) {
      return NextResponse.json({ success: false, error: 'Invalid discount_type' }, { status: 422 });
    }

    for (const discount of discounts) {
      if (discount.percentage === undefined || !Number.isFinite(discount.percentage) || discount.percentage < 0 || discount.percentage > 100) {
        return NextResponse.json({ success: false, error: 'Percentage must be 0-100' }, { status: 422 });
      }
    }

    const saved = [];
    for (const discount of discounts) {
      const { data: existing, error: findError } = await supabase
        .from('property_discounts')
        .select('id')
        .eq('property_id', id)
        .eq('discount_type', discount.discount_type)
        .maybeSingle();
      if (findError) throw findError;

      const payload = {
        percentage: discount.percentage,
        min_nights: discount.min_nights,
        updated_at: new Date().toISOString(),
      };
      const query = existing
        ? supabase.from('property_discounts').update(payload).eq('id', existing.id).eq('property_id', id)
        : supabase.from('property_discounts').insert({ property_id: id, discount_type: discount.discount_type, ...payload });
      const { data, error } = await query.select().single();
      if (error) throw error;
      saved.push(data);
    }

    return NextResponse.json({ success: true, data: body.discount_type ? saved[0] : saved });
  } catch (err) {
    if (isMissingDiscountsTableError(err)) {
      return NextResponse.json({ success: false, error: 'Discounts feature is not available' }, { status: 501 });
    }
    console.error('Error creating discount:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
