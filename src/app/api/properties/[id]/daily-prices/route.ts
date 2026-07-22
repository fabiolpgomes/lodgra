/**
 * Story 36.1: Daily prices endpoints
 * GET/POST /api/properties/:id/daily-prices
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, DailyPricePayload, PropertyDailyPrice } from '@/types/pricing.types';

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

// GET /api/properties/:id/daily-prices?month=2026-07
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
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

    const month = req.nextUrl.searchParams.get('month');
    if (!month) {
      return NextResponse.json(
        { success: false, error: 'month query parameter required (YYYY-MM)' },
        { status: 400 }
      );
    }

    // Parse month (2026-07 format)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('property_daily_prices')
      .select('*')
      .eq('property_id', id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('Error fetching daily prices:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/daily-prices
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;
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

    const body: DailyPricePayload = await req.json();

    // Validation
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
        { status: 422 }
      );
    }

    if (body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price cannot be negative' },
        { status: 422 }
      );
    }

    const { data, error } = await supabase
      .from('property_daily_prices')
      .upsert(
        {
          property_id: id,
          date: body.date,
          price: body.price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id,date' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating daily price:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
