import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'

interface PerformanceMetricsParams {
  organizationId?: string
  propertyId?: string
  startDate?: string
  endDate?: string
  metric?: 'impressions' | 'clicks' | 'conversions' | 'ctr'
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    // Get user's organization
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const organizationId = userProfile.organization_id

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId') || undefined
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const timeRange = searchParams.get('timeRange') || '30' // days

    // Build query
    let query = supabase
      .from('google_performance_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    const { data: metrics, error: metricsError } = await query

    if (metricsError) {
      console.error('[API] Error fetching metrics:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    if (!metrics || metrics.length === 0) {
      // Return empty structure if no data
      return NextResponse.json({
        data: [],
        summary: {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          avgCtr: 0,
          avgConversionRate: 0,
        },
        timeRange: {
          startDate,
          endDate,
          days: Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)),
        },
      })
    }

    // Calculate summary statistics
    const summary = {
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      avgCtr: 0,
      avgConversionRate: 0,
      peakImpressions: 0,
      peakClicks: 0,
      peakConversions: 0,
    }

    for (const metric of metrics) {
      summary.totalImpressions += metric.impressions || 0
      summary.totalClicks += metric.clicks || 0
      summary.totalConversions += metric.conversions || 0
      summary.peakImpressions = Math.max(summary.peakImpressions, metric.impressions || 0)
      summary.peakClicks = Math.max(summary.peakClicks, metric.clicks || 0)
      summary.peakConversions = Math.max(summary.peakConversions, metric.conversions || 0)
    }

    // Calculate averages
    if (summary.totalImpressions > 0) {
      summary.avgCtr = Number(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2))
    }
    if (summary.totalClicks > 0) {
      summary.avgConversionRate = Number(((summary.totalConversions / summary.totalClicks) * 100).toFixed(2))
    }

    return NextResponse.json({
      data: metrics,
      summary,
      timeRange: {
        startDate,
        endDate,
        days: Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)),
      },
    })
  } catch (error) {
    console.error('[API] Performance metrics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Endpoint to trigger manual sync
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admins to trigger sync
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can trigger sync' }, { status: 403 })
    }

    // Import and trigger sync
    const { triggerPerformanceSync } = await import('@/lib/google/performance-sync')
    const result = await triggerPerformanceSync()

    return NextResponse.json({
      message: 'Sync triggered successfully',
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Sync trigger error:', error)
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 })
  }
}
