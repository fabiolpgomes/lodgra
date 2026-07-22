/**
 * Story 36.5: Bulk daily prices endpoints
 * POST/DELETE /api/properties/:id/daily-prices/bulk
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types/pricing.types';

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

interface BulkPriceOperation {
  date: string;
  price: number;
}

// POST /api/properties/:id/daily-prices/bulk
// Batch upsert for bulk price operations
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

    const body = await req.json();
    const { operations } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid operations array' },
        { status: 422 }
      );
    }

    // Validate all operations
    for (const op of operations) {
      if (!op.date || !/^\d{4}-\d{2}-\d{2}$/.test(op.date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
          { status: 422 }
        );
      }

      if (typeof op.price !== 'number' || op.price < 0) {
        return NextResponse.json(
          { success: false, error: 'Price must be a non-negative number' },
          { status: 422 }
        );
      }
    }

    // Prepare data for upsert
    const records = operations.map((op: BulkPriceOperation) => ({
      property_id: id,
      date: op.date,
      price: op.price,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert
    const { data, error } = await supabase
      .from('property_daily_prices')
      .upsert(records, { onConflict: 'property_id,date' })
      .select();

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        data,
        message: `Updated ${records.length} prices`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error in bulk pricing operation:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/:id/daily-prices/bulk
// Batch delete for bulk delete operations
export async function DELETE(
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

    const body = await req.json();
    const { dates } = body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates array' },
        { status: 422 }
      );
    }

    // Validate all dates
    for (const date of dates) {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
          { status: 422 }
        );
      }
    }

    // Batch delete
    const { error } = await supabase
      .from('property_daily_prices')
      .delete()
      .eq('property_id', id)
      .in('date', dates);

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${dates.length} prices`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Error in bulk delete operation:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
