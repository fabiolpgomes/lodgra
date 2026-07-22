/**
 * Story 36.8: AI-Driven Price Recommendations
 * POST /api/properties/:id/recommendations/:recommendationId/reject
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/pricing.types';


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

// POST /api/properties/:id/recommendations/:recommendationId/reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recommendationId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, recommendationId } = await params;

  try {
    const supabase = await createAdminClient();const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isOwner = await validatePropertyOwnership(id, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Update recommendation to rejected
    const { error: updateError } = await supabase
      .from('pricing_recommendations')
      .update({
        accepted: false,
        rejected_at: now,
        accepted_at: null,
      })
      .eq('id', recommendationId)
      .eq('property_id', id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: {
        rejected: true,
        timestamp: now,
      },
    });
  } catch (err) {
    console.error('Error rejecting recommendation:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
