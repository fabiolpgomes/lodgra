/**
 * Story 36.10: Competitor Monitoring API Endpoints
 * GET/POST /api/properties/[id]/competitors
 * GET /api/properties/[id]/competitors - List all competitors
 * POST /api/properties/[id]/competitors - Add new competitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateCompetitorUrl, normalizeUrl, getPlatformFromUrl, getPlatformDisplayName } from '@/lib/competitor/urlValidator';
import { analyzeMarketPosition } from '@/lib/competitor/marketAnalysis';
import { CompetitorMonitoringAPIResponse } from '@/types/competitor';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const propertyId = params.id;

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, base_price')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Fetch all competitors for this property
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitors')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (competitorsError) {
      return NextResponse.json(
        { error: 'Failed to fetch competitors' },
        { status: 500 }
      );
    }

    // Fetch recent alerts
    const { data: recentAlerts } = await supabase
      .from('competitor_price_alerts')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch benchmark cache
    const { data: benchmarkCache } = await supabase
      .from('competitor_benchmark_cache')
      .select('*')
      .eq('property_id', propertyId)
      .order('cache_date', { ascending: false })
      .limit(1)
      .single();

    // Fetch price history for all competitors
    const priceHistory: Record<string, any[]> = {};
    if (competitors && competitors.length > 0) {
      for (const competitor of competitors) {
        const { data: history } = await supabase
          .from('competitor_price_history')
          .select('*')
          .eq('competitor_id', competitor.id)
          .order('scrape_date', { ascending: false })
          .limit(7);

        priceHistory[competitor.id] = history || [];
      }
    }

    // Calculate market analysis
    const competitorPrices = competitors
      ?.filter(c => c.last_scraped_price)
      .map(c => c.last_scraped_price) || [];

    const analysis = analyzeMarketPosition(property.base_price, competitorPrices);

    const response: CompetitorMonitoringAPIResponse = {
      competitors: competitors || [],
      benchmark: benchmarkCache,
      recentAlerts: recentAlerts || [],
      priceHistory,
      analysis: {
        marketAveragePrice: analysis.marketAveragePrice,
        hostPrice: property.base_price,
        percentageDifference: analysis.percentageDifference,
        pricePosition: analysis.pricePosition,
        marketRange: {
          min: analysis.marketMinPrice,
          max: analysis.marketMaxPrice,
        },
        recommendation: analysis.recommendation,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Competitor monitoring GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitor data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const propertyId = params.id;
    const body = await request.json();

    const { competitorUrl, monitoringFrequency = 'daily', priceAlertThreshold = 10 } = body;

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Validate URL
    const validation = validateCompetitorUrl(competitorUrl);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid competitor URL' },
        { status: 400 }
      );
    }

    // Check competitor limit (max 10 per property)
    const { count, error: countError } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('property_id', propertyId);

    if (countError || (count || 0) >= 10) {
      return NextResponse.json(
        { error: 'Competitor limit reached (max 10 per property)' },
        { status: 400 }
      );
    }

    // Create competitor record
    const platform = getPlatformFromUrl(competitorUrl);
    const normalizedUrl = normalizeUrl(competitorUrl);

    const { data: newCompetitor, error: insertError } = await supabase
      .from('competitors')
      .insert({
        property_id: propertyId,
        competitor_url: normalizedUrl,
        platform,
        competitor_name: validation.propertyName || `${getPlatformDisplayName(platform)} Property`,
        competitor_property_type: validation.propertyId,
        monitoring_frequency: monitoringFrequency,
        price_alert_threshold: priceAlertThreshold,
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !newCompetitor) {
      return NextResponse.json(
        { error: 'Failed to add competitor' },
        { status: 500 }
      );
    }

    return NextResponse.json(newCompetitor, { status: 201 });
  } catch (error) {
    console.error('Competitor monitoring POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add competitor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const propertyId = params.id;
    const { competitorId } = await request.json();

    // Verify ownership by checking property
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single();

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Delete competitor (cascade will handle price history)
    const { error: deleteError } = await supabase
      .from('competitors')
      .delete()
      .eq('id', competitorId)
      .eq('property_id', propertyId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete competitor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Competitor monitoring DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete competitor' },
      { status: 500 }
    );
  }
}
