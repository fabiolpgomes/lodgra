/**
 * Story 36.1: Individual daily price endpoint
 * DELETE /api/properties/:id/daily-prices/:date
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
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

// DELETE /api/properties/:id/daily-prices/:date
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; date: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, date } = await params;
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

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('property_daily_prices')
      .delete()
      .eq('property_id', id)
      .eq('date', date);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Error deleting daily price:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
