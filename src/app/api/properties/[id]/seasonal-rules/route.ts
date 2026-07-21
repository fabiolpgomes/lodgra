/**
 * Story 36.6: Seasonal Pricing Rules endpoints
 * GET/POST /api/properties/:id/seasonal-rules
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, SeasonalRulePayload, SeasonalPricingRule } from '@/types/pricing.types';
import { PricingCalculator } from '@/lib/pricing/pricing-calculator';

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

function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// GET /api/properties/:id/seasonal-rules
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
      .from('seasonal_pricing_rules')
      .select('*')
      .eq('property_id', id)
      .order('date_start');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('Error fetching seasonal rules:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/seasonal-rules
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

    const body: SeasonalRulePayload = await req.json();

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rule name is required' },
        { status: 422 }
      );
    }

    if (!isValidDateFormat(body.date_start)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date_start format (YYYY-MM-DD)' },
        { status: 422 }
      );
    }

    if (!isValidDateFormat(body.date_end)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date_end format (YYYY-MM-DD)' },
        { status: 422 }
      );
    }

    if (body.date_end < body.date_start) {
      return NextResponse.json(
        { success: false, error: 'End date must be after or equal to start date' },
        { status: 422 }
      );
    }

    if (body.price_per_night < 0) {
      return NextResponse.json(
        { success: false, error: 'Price per night cannot be negative' },
        { status: 422 }
      );
    }

    // Insert rule
    const { data, error } = await supabase
      .from('seasonal_pricing_rules')
      .insert([
        {
          property_id: id,
          name: body.name.trim(),
          date_start: body.date_start,
          date_end: body.date_end,
          price_per_night: body.price_per_night,
          is_active: body.is_active !== false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating seasonal rule:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
