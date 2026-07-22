/**
 * Story 36.9: Revenue Forecasting API Endpoint
 * GET /api/properties/[id]/analytics/forecasting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeTimeSeries, generateForecast, calculateOccupancyForecast, estimateBasePrice } from '@/lib/forecasting/timeSeriesAnalysis';
import { calculateSeasonalFactor, adjustForecastWithSeasoning, getSeasonalSummary } from '@/lib/forecasting/seasonalAdjustment';
import { calculateConfidenceScore, getDataWarning } from '@/lib/forecasting/confidenceScoring';
import { ForecastingAPIResponse, ForecastChartPoint } from '@/types/forecasting';

interface Booking {
  check_in: string;
  check_out: string;
  total_amount: number | null;
  status: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const propertyId = (await params).id;

    // Verify property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, name, base_price, currency')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Fetch last 90 days of reservations
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: reservations, error: reservationError } = await supabase
      .from('reservations')
      .select('check_in, check_out, total_amount, status')
      .eq('property_listing_id', propertyId)
      .gte('check_in', ninetyDaysAgo.toISOString().split('T')[0])
      .eq('status', 'confirmed');

    if (reservationError) {
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      );
    }

    // Convert reservations to booking data
    const bookingData = reservations.map((reservation: Booking) => ({
      date: new Date(reservation.check_in),
      revenue: reservation.total_amount || 0,
      occupancy: true,
    }));

    // Check cache first
    const { data: cachedForecast } = await supabase
      .from('forecast_cache')
      .select('forecast_data')
      .eq('property_id', propertyId)
      .eq('cache_key', 'forecast_main')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedForecast) {
      return NextResponse.json(JSON.parse(cachedForecast.forecast_data));
    }

    // Analyze time series
    const timeSeries = analyzeTimeSeries(bookingData);
    const seasonalFactors = calculateSeasonalFactor(
      new Map([
        [0, bookingData.filter(b => b.date.getMonth() === 0).map(b => b.revenue)],
        [1, bookingData.filter(b => b.date.getMonth() === 1).map(b => b.revenue)],
        [2, bookingData.filter(b => b.date.getMonth() === 2).map(b => b.revenue)],
        [3, bookingData.filter(b => b.date.getMonth() === 3).map(b => b.revenue)],
        [4, bookingData.filter(b => b.date.getMonth() === 4).map(b => b.revenue)],
        [5, bookingData.filter(b => b.date.getMonth() === 5).map(b => b.revenue)],
        [6, bookingData.filter(b => b.date.getMonth() === 6).map(b => b.revenue)],
        [7, bookingData.filter(b => b.date.getMonth() === 7).map(b => b.revenue)],
        [8, bookingData.filter(b => b.date.getMonth() === 8).map(b => b.revenue)],
        [9, bookingData.filter(b => b.date.getMonth() === 9).map(b => b.revenue)],
        [10, bookingData.filter(b => b.date.getMonth() === 10).map(b => b.revenue)],
        [11, bookingData.filter(b => b.date.getMonth() === 11).map(b => b.revenue)],
      ])
    );

    // Calculate confidence score
    const confidence = calculateConfidenceScore(
      bookingData.length,
      timeSeries.volatility,
      timeSeries.averageRevenue,
      timeSeries.trend === 'stable' ? 0 : timeSeries.trend === 'increasing' ? 0.3 : -0.3,
      timeSeries.seasonalityStrength
    );

    const dataWarning = getDataWarning(bookingData.length);

    // Generate forecasts for 30, 60, 90 days
    const now = new Date();
    const forecast30 = generateForecast(bookingData, 30, now);
    const forecast60 = generateForecast(bookingData, 60, now);
    const forecast90 = generateForecast(bookingData, 90, now);

    // Calculate totals
    const total30 = forecast30.reduce((sum, f) => sum + f.projectedRevenue, 0);
    const total60 = forecast60.reduce((sum, f) => sum + f.projectedRevenue, 0);
    const total90 = forecast90.reduce((sum, f) => sum + f.projectedRevenue, 0);

    // Save forecasts to database
    await supabase.from('revenue_forecasts').insert([
      {
        property_id: propertyId,
        forecast_date: new Date().toISOString().split('T')[0],
        forecast_period_days: 30,
        projected_revenue: total30,
        confidence_score: confidence.score,
        confidence_level: confidence.level,
        occupancy_rate_forecast: calculateOccupancyForecast(bookingData),
        seasonal_factor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
        base_price_estimate: estimateBasePrice(bookingData),
        data_points_count: bookingData.length,
        reasoning: confidence.reasoning,
      },
      {
        property_id: propertyId,
        forecast_date: new Date().toISOString().split('T')[0],
        forecast_period_days: 60,
        projected_revenue: total60,
        confidence_score: confidence.score,
        confidence_level: confidence.level,
        occupancy_rate_forecast: calculateOccupancyForecast(bookingData),
        seasonal_factor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
        base_price_estimate: estimateBasePrice(bookingData),
        data_points_count: bookingData.length,
        reasoning: confidence.reasoning,
      },
      {
        property_id: propertyId,
        forecast_date: new Date().toISOString().split('T')[0],
        forecast_period_days: 90,
        projected_revenue: total90,
        confidence_score: confidence.score,
        confidence_level: confidence.level,
        occupancy_rate_forecast: calculateOccupancyForecast(bookingData),
        seasonal_factor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
        base_price_estimate: estimateBasePrice(bookingData),
        data_points_count: bookingData.length,
        reasoning: confidence.reasoning,
      },
    ]).then(({ error }) => {
      if (error) console.error('Failed to save forecasts:', error);
    });

    // Build chart data
    const chartData: ForecastChartPoint[] = forecast90.map(f => ({
      date: f.date.toISOString().split('T')[0],
      projected: f.projectedRevenue,
      lower: f.confidenceInterval.lower,
      upper: f.confidenceInterval.upper,
    }));

    // Build response
    const response: ForecastingAPIResponse = {
      forecasts: {
        days30: {
          id: 'forecast-30',
          propertyId,
          forecastDate: new Date().toISOString().split('T')[0],
          forecastPeriodDays: 30,
          projectedRevenue: Math.round(total30 * 100) / 100,
          confidenceScore: confidence.score,
          confidenceLevel: confidence.level,
          occupancyRateForecast: calculateOccupancyForecast(bookingData),
          seasonalFactor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
          basePriceEstimate: estimateBasePrice(bookingData),
          dataPointsCount: bookingData.length,
          reasoning: confidence.reasoning,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        days60: {
          id: 'forecast-60',
          propertyId,
          forecastDate: new Date().toISOString().split('T')[0],
          forecastPeriodDays: 60,
          projectedRevenue: Math.round(total60 * 100) / 100,
          confidenceScore: confidence.score,
          confidenceLevel: confidence.level,
          occupancyRateForecast: calculateOccupancyForecast(bookingData),
          seasonalFactor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
          basePriceEstimate: estimateBasePrice(bookingData),
          dataPointsCount: bookingData.length,
          reasoning: confidence.reasoning,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        days90: {
          id: 'forecast-90',
          propertyId,
          forecastDate: new Date().toISOString().split('T')[0],
          forecastPeriodDays: 90,
          projectedRevenue: Math.round(total90 * 100) / 100,
          confidenceScore: confidence.score,
          confidenceLevel: confidence.level,
          occupancyRateForecast: calculateOccupancyForecast(bookingData),
          seasonalFactor: Array.from(seasonalFactors.values())[new Date().getMonth()]?.factor,
          basePriceEstimate: estimateBasePrice(bookingData),
          dataPointsCount: bookingData.length,
          reasoning: confidence.reasoning,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      assumptions: {
        id: 'assumptions-1',
        propertyId,
        analysisDate: new Date().toISOString().split('T')[0],
        baseRevenue90Days: Math.round(bookingData.reduce((sum, b) => sum + b.revenue, 0) * 100) / 100,
        avgOccupancyRate: calculateOccupancyForecast(bookingData),
        seasonalPattern: Array.from(seasonalFactors.entries()).reduce(
          (acc, [month, factor]) => ({ ...acc, [month]: factor.factor }),
          {}
        ) as Record<number, number>,
        dayOfWeekPattern: Object.fromEntries(timeSeries.dayOfWeekPattern),
        holidayEvents: [],
        last90DaysBookings: bookingData.length,
        createdAt: new Date().toISOString(),
      },
      chartData,
      summary: {
        currentMonthProjection: Math.round(total30 * 100) / 100,
        nextMonthProjection: Math.round((total60 - total30) * 100) / 100,
        quarterlyProjection: Math.round(total90 * 100) / 100,
        trendsDescription: `Revenue trend is ${timeSeries.trend} with ${timeSeries.volatility} volatility.`,
        seasonalityDescription: getSeasonalSummary(seasonalFactors),
        recommendations: dataWarning ? [dataWarning] : [],
      },
    };

    // Cache result (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase.from('forecast_cache').upsert({
      property_id: propertyId,
      cache_key: 'forecast_main',
      forecast_data: JSON.stringify(response),
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Forecasting API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecasts' },
      { status: 500 }
    );
  }
}
