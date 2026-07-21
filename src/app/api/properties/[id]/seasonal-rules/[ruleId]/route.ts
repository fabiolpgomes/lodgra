/**
 * Story 36.6: Individual Seasonal Rule endpoints
 * PATCH/DELETE /api/properties/:id/seasonal-rules/:ruleId
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UpdateSeasonalRulePayload } from '@/types/pricing.types';

const supabase = createAdminClient();

async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .single();

  return !!data;
}

async function validateRuleOwnership(
  propertyId: string,
  ruleId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('seasonal_pricing_rules')
    .select('id')
    .eq('id', ruleId)
    .eq('property_id', propertyId)
    .single();

  if (!data) return false;

  return validatePropertyOwnership(propertyId, userId);
}

function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// PATCH /api/properties/:id/seasonal-rules/:ruleId
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, ruleId } = await params;
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

    const isOwner = await validateRuleOwnership(id, ruleId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body: UpdateSeasonalRulePayload = await req.json();

    // Validation
    if (body.name !== undefined && (body.name.length === 0 || body.name.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Rule name cannot be empty' },
        { status: 422 }
      );
    }

    if (body.date_start !== undefined && !isValidDateFormat(body.date_start)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date_start format (YYYY-MM-DD)' },
        { status: 422 }
      );
    }

    if (body.date_end !== undefined && !isValidDateFormat(body.date_end)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date_end format (YYYY-MM-DD)' },
        { status: 422 }
      );
    }

    // Check date range if both are provided
    const dateStart = body.date_start;
    const dateEnd = body.date_end;
    if (dateStart && dateEnd && dateEnd < dateStart) {
      return NextResponse.json(
        { success: false, error: 'End date must be after or equal to start date' },
        { status: 422 }
      );
    }

    if (body.price_per_night !== undefined && body.price_per_night < 0) {
      return NextResponse.json(
        { success: false, error: 'Price per night cannot be negative' },
        { status: 422 }
      );
    }

    // Build update object (only include provided fields)
    const updateObj: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateObj.name = body.name.trim();
    if (body.date_start !== undefined) updateObj.date_start = body.date_start;
    if (body.date_end !== undefined) updateObj.date_end = body.date_end;
    if (body.price_per_night !== undefined) updateObj.price_per_night = body.price_per_night;
    if (body.is_active !== undefined) updateObj.is_active = body.is_active;

    // Update rule
    const { data, error } = await supabase
      .from('seasonal_pricing_rules')
      .update(updateObj)
      .eq('id', ruleId)
      .eq('property_id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error updating seasonal rule:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/:id/seasonal-rules/:ruleId
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, ruleId } = await params;
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

    const isOwner = await validateRuleOwnership(id, ruleId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete rule
    const { error } = await supabase
      .from('seasonal_pricing_rules')
      .delete()
      .eq('id', ruleId)
      .eq('property_id', id);

    if (error) throw error;

    return NextResponse.json(
      { success: true, data: { id: ruleId } },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error deleting seasonal rule:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
