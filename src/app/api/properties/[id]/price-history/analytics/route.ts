/**
 * Story 36.7: Price Analytics Dashboard API
 * GET /api/properties/:id/price-history/analytics
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, PriceAnalytics } from '@/types/pricing.types';


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

// GET /api/properties/:id/price-history/analytics?period=30
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PriceAnalytics[]>>> {
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

    // Get analytics period (default: 30 days)
    const searchParams = req.nextUrl.searchParams;
    const period = Math.max(1, parseInt(searchParams.get('period') || '30', 10));
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const { data: analytics, error } = await supabase
      .from('price_analytics')
      .select('*')
      .eq('property_id', id)
      .gte('period_start', startDate.toISOString().split('T')[0])
      .lte('period_end', endDate.toISOString().split('T')[0])
      .order('period_start', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: analytics as PriceAnalytics[],
    });
  } catch (err) {
    console.error('Error fetching price analytics:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
