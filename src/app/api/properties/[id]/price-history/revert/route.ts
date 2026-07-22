/**
 * Story 36.7: Price History Revert API
 * POST /api/properties/:id/price-history/revert
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PriceHistory, RevertPricePayload } from '@/types/pricing.types';


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

// POST /api/properties/:id/price-history/revert
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PriceHistory>>> {
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

    const body: RevertPricePayload = await req.json();

    if (!body.recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId is required' },
        { status: 422 }
      );
    }

    // Get the record to revert to
    const { data: recordToRevert, error: fetchError } = await supabase
      .from('price_history')
      .select('*')
      .eq('id', body.recordId)
      .eq('property_id', id)
      .eq('is_deleted', false)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Get the current price (most recent non-deleted record)
    const { data: currentRecord } = await supabase
      .from('price_history')
      .select('*')
      .eq('property_id', id)
      .eq('is_deleted', false)
      .order('date_applied', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create new revert record
    const { data: revertRecord, error: createError } = await supabase
      .from('price_history')
      .insert([
        {
          property_id: id,
          price: recordToRevert.price,
          date_applied: new Date().toISOString().split('T')[0],
          changed_by: user.id,
          change_reason: body.reason || `Reverted to price from ${recordToRevert.date_applied}`,
          is_revert: true,
          previous_price_record_id: body.recordId,
          is_deleted: false,
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json(
      { success: true, data: revertRecord as PriceHistory },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error reverting price:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
