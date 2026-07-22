/**
 * Story 36.8: AI-Driven Price Recommendations
 * POST /api/properties/:id/recommendations/:recommendationId/accept
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/pricing.types';

const supabase = await createAdminClient();

interface AcceptPayload {
  applyImmediately?: boolean;
}

async function validatePropertyOwnership(propertyId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', userId)
    .single();

  return !!data;
}

async function getRecommendation(
  propertyId: string,
  recommendationId: string
): Promise<{ id: string; recommended_price: number }> {
  const { data, error } = await supabase
    .from('pricing_recommendations')
    .select('id, recommended_price')
    .eq('id', recommendationId)
    .eq('property_id', propertyId)
    .single();

  if (error) throw error;
  return data;
}

// POST /api/properties/:id/recommendations/:recommendationId/accept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recommendationId: string }> }
): Promise<NextResponse<ApiResponse>> {
  const { id, recommendationId } = await params;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isOwner = await validatePropertyOwnership(id, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get the recommendation
    const recommendation = await getRecommendation(id, recommendationId);
    if (!recommendation) {
      return NextResponse.json(
        { success: false, error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    const body: AcceptPayload = await req.json();
    const now = new Date().toISOString();

    // Update recommendation to accepted
    const { error: updateError } = await supabase
      .from('pricing_recommendations')
      .update({
        accepted: true,
        accepted_at: now,
        rejected_at: null,
      })
      .eq('id', recommendationId)
      .eq('property_id', id);

    if (updateError) {
      throw updateError;
    }

    // If applyImmediately is true, update the property's base price
    if (body.applyImmediately) {
      const { error: priceError } = await supabase
        .from('property_prices')
        .update({
          base_price: recommendation.recommended_price,
          updated_at: now,
        })
        .eq('property_id', id);

      if (priceError) {
        console.error('Error updating property price:', priceError);
        // Continue anyway - recommendation is still accepted
      }

      // Create a price history record
      await supabase.from('price_history').insert([
        {
          property_id: id,
          price: recommendation.recommended_price,
          date_applied: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          changed_by: user.id,
          change_reason: 'AI recommendation accepted',
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        accepted: true,
        timestamp: now,
        applyImmediately: body.applyImmediately || false,
      },
    });
  } catch (err) {
    console.error('Error accepting recommendation:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
