/**
 * Story 36.8: AI-Driven Price Recommendations
 * GET /api/properties/:id/recommendations
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { RecommendationEngine } from '@/lib/pricing/recommendation-engine';
import { MarketBenchmarkService } from '@/lib/pricing/market-benchmark';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PriceRecommendation } from '@/types/pricing.types';
import type { PriceHistory } from '@/types/pricing.types';

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

async function getPropertyDetails(propertyId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select(
      `
      id,
      name,
      property_type,
      bedrooms,
      bathrooms,
      amenities,
      region_id,
      owner_id
    `
    )
    .eq('id', propertyId)
    .single();

  if (error) throw error;
  return data;
}

async function getCurrentPrice(propertyId: string): Promise<number> {
  const { data } = await supabase
    .from('property_prices')
    .select('base_price')
    .eq('property_id', propertyId)
    .single();

  return data?.base_price ?? 100; // Default to 100 if not set
}

async function getPriceHistory(propertyId: string): Promise<PriceHistory[]> {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('property_id', propertyId)
    .eq('is_deleted', false)
    .order('date_applied', { ascending: false })
    .limit(400); // Get up to 400 records (covers ~13 months daily)

  if (error) throw error;
  return data || [];
}

// GET /api/properties/:id/recommendations
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isOwner = await validatePropertyOwnership(id, user.id);
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get property details
    const property = await getPropertyDetails(id);
    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Get current price
    const currentPrice = await getCurrentPrice(id);

    // Get price history (last 12 months)
    const priceHistory = await getPriceHistory(id);

    // Get market benchmark
    const marketBenchmark = MarketBenchmarkService.getBenchmark(
      property.region_id,
      property.property_type || 'apartment',
      {
        beds: property.bedrooms || 2,
        baths: property.bathrooms || 1,
        amenities: property.amenities || [],
        propertyType: property.property_type || 'apartment',
        region: property.region_id,
      }
    );

    // Generate recommendation
    const result = RecommendationEngine.generateRecommendation(
      priceHistory,
      currentPrice,
      marketBenchmark,
      {
        currentMonthlyBookings: 15, // Can be pulled from bookings data
        avgMonthlyBookings: 15,
      }
    );

    // Store recommendation in database
    const { data: recommendation, error: insertError } = await supabase
      .from('pricing_recommendations')
      .insert([
        {
          property_id: id,
          recommended_price: result.recommendedPrice,
          confidence: result.confidence,
          reason: result.reason,
          market_analysis: result.marketAnalysis,
          revenue_projection: result.revenueProjection,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error storing recommendation:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to store recommendation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        recommendations: [recommendation as PriceRecommendation],
      },
    });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
