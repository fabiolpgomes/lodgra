import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { platformAggregator } from '@/lib/distribution/platform-aggregator'
import { marketShareCalculator } from '@/lib/distribution/market-share-calculator'
import { channelInsights } from '@/lib/distribution/channel-insights'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    )

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Aggregate metrics from all platforms
    const aggregated = await platformAggregator.aggregateMetrics(
      userProfile.organization_id,
      propertyId,
      startDate,
      endDate
    )

    // Get channel performance
    const channelPerformance = await platformAggregator.getChannelPerformance(
      userProfile.organization_id,
      propertyId,
      days
    )

    // Calculate market share (using latest data)
    const latestData = aggregated[aggregated.length - 1] || {}
    const marketShare = marketShareCalculator.calculateMarketShare(latestData)

    // Generate channel-specific insights
    const insights = marketShare.insights
    const recommendations = marketShare.recommendations

    // Add platform-specific tips
    const platformTips: Record<string, { tips: string[] }> = {}
    for (const platform of ['google', 'airbnb', 'booking', 'vrbo', 'flatio']) {
      const platformData = channelPerformance.find((p) => p.platform === platform)
      if (platformData) {
        platformTips[platform] = channelInsights.generateInsights(platform, platformData)
      }
    }

    return NextResponse.json({
      platforms: channelPerformance,
      marketShares: Object.fromEntries(
        marketShare.platformShares.map((s) => [s.platform, s.bookingShare])
      ),
      totalImpressions: aggregated[aggregated.length - 1]?.totals?.impressions || 0,
      totalClicks: aggregated[aggregated.length - 1]?.totals?.clicks || 0,
      totalBookings: aggregated[aggregated.length - 1]?.totals?.conversions || 0,
      totalRevenue: aggregated[aggregated.length - 1]?.totals?.revenue || 0,
      insights,
      recommendations,
      platformTips,
      period: `${startDate} to ${endDate}`,
    })
  } catch (error) {
    console.error('[API] Aggregation error:', error)
    return NextResponse.json({ error: 'Failed to aggregate metrics' }, { status: 500 })
  }
}
