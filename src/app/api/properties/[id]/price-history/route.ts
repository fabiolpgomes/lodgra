/**
 * Story 36.7: Price History API
 * GET /api/properties/:id/price-history (paginated history)
 * POST /api/properties/:id/price-history (filter and fetch)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import {
  ApiResponse,
  HistoryFiltersPayload,
  PriceHistory,
  PriceHistoryResponse,
} from '@/types/pricing.types';


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

// GET /api/properties/:id/price-history?page=1&limit=50
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PriceHistoryResponse>>> {
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

    // Get pagination params
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('price_history')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', id)
      .eq('is_deleted', false);

    // Get paginated data
    const { data: history, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('property_id', id)
      .eq('is_deleted', false)
      .order('date_applied', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: {
        data: history as PriceHistory[],
        total,
        page,
        limit,
        hasMore,
      },
    });
  } catch (err) {
    console.error('Error fetching price history:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/properties/:id/price-history (with filters)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<PriceHistoryResponse>>> {
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

    const filters: HistoryFiltersPayload = await req.json();
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('price_history')
      .select('*', { count: 'exact' })
      .eq('property_id', id)
      .eq('is_deleted', false);

    // Apply date filters
    if (filters.startDate) {
      query = query.gte('date_applied', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date_applied', filters.endDate);
    }

    // Apply search filter (search in reason field)
    if (filters.search) {
      query = query.ilike('change_reason', `%${filters.search}%`);
    }

    // Get count before pagination
    const { count } = await query;

    // Apply ordering and pagination
    const { data: history, error } = await query
      .order('date_applied', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const total = count || 0;
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: {
        data: history as PriceHistory[],
        total,
        page,
        limit,
        hasMore,
      },
    });
  } catch (err) {
    console.error('Error filtering price history:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
