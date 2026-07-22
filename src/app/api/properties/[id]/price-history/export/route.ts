/**
 * Story 36.7: Price History CSV Export API
 * GET /api/properties/:id/price-history/export
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { convertToCsvExtended } from '@/lib/pricing/csv-exporter';
import { NextRequest, NextResponse } from 'next/server';
import { PriceHistory } from '@/types/pricing.types';

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

// GET /api/properties/:id/price-history/export?extended=true
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Get all history (no pagination for export)
    const { data: history, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('property_id', id)
      .eq('is_deleted', false)
      .order('date_applied', { ascending: false });

    if (error) throw error;

    const csv = convertToCsvExtended(history as PriceHistory[]);
    const timestamp = new Date().toISOString().split('T')[0];

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="price-history-${id}-${timestamp}.csv"`,
      },
    });
  } catch (err) {
    console.error('Error exporting price history:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
