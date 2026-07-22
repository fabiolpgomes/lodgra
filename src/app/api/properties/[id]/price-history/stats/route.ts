/**
 * Story 36.7: Price History Statistics API
 * GET /api/properties/:id/price-history/stats
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { calculatePriceStats } from '@/lib/pricing/price-history-calculator';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PriceHistory, PriceStatistics } from '@/types/pricing.types';

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

// GET /api/properties/:id/price-history/stats?days=30
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PriceStatistics>>> {
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

    // Get number of days to analyze (default: 30)
    const searchParams = req.nextUrl.searchParams;
    const days = Math.max(1, parseInt(searchParams.get('days') || '30', 10));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('property_id', id)
      .eq('is_deleted', false)
      .gte('date_applied', startDate.toISOString().split('T')[0])
      .order('date_applied', { ascending: true });

    if (error) throw error;

    const stats = calculatePriceStats(history as PriceHistory[]);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('Error fetching price statistics:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
