import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'

interface PlatformMetrics {
  platform: 'google' | 'airbnb' | 'booking' | 'vrbo' | 'flatio'
  propertyId: string
  date: string
  impressions: number
  clicks: number
  conversions: number
  revenue?: number
  ctr?: number
  conversionRate?: number
}

interface AggregatedMetrics {
  date: string
  google: PlatformMetrics
  airbnb: PlatformMetrics
  booking: PlatformMetrics
  vrbo: PlatformMetrics
  flatio: PlatformMetrics
  totals: {
    impressions: number
    clicks: number
    conversions: number
    revenue: number
    avgCtr: number
    avgConversionRate: number
  }
}

interface ChannelPerformance {
  platform: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  conversionRate: number
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

export class PlatformAggregator {
  private supabase: ReturnType<typeof createClient> | null = null

  private getSupabase(): ReturnType<typeof createClient> {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      )
    }
    return this.supabase!
  }

  async aggregateMetrics(
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<AggregatedMetrics[]> {
    try {
      const results: AggregatedMetrics[] = []

      // Fetch metrics from each platform
      const googleData = await this.fetchGoogleMetrics(propertyId, startDate, endDate)
      const airbnbData = await this.fetchAirbnbMetrics(organizationId, propertyId, startDate, endDate)
      const bookingData = await this.fetchBookingMetrics(organizationId, propertyId, startDate, endDate)
      const vrboData = await this.fetchVrboMetrics(organizationId, propertyId, startDate, endDate)
      const flatioData = await this.fetchFlatioMetrics(organizationId, propertyId, startDate, endDate)

      // Group by date and aggregate
      const dateMap = new Map<string, AggregatedMetrics>()

      // Process Google metrics
      googleData.forEach((metric) => {
        const existing = dateMap.get(metric.date) || this.createEmptyAggregation(metric.date)
        existing.google = metric
        dateMap.set(metric.date, existing)
      })

      // Process Airbnb metrics
      airbnbData.forEach((metric) => {
        const existing = dateMap.get(metric.date) || this.createEmptyAggregation(metric.date)
        existing.airbnb = metric
        dateMap.set(metric.date, existing)
      })

      // Process Booking metrics
      bookingData.forEach((metric) => {
        const existing = dateMap.get(metric.date) || this.createEmptyAggregation(metric.date)
        existing.booking = metric
        dateMap.set(metric.date, existing)
      })

      // Process VRBO metrics
      vrboData.forEach((metric) => {
        const existing = dateMap.get(metric.date) || this.createEmptyAggregation(metric.date)
        existing.vrbo = metric
        dateMap.set(metric.date, existing)
      })

      // Process Flatio metrics
      flatioData.forEach((metric) => {
        const existing = dateMap.get(metric.date) || this.createEmptyAggregation(metric.date)
        existing.flatio = metric
        dateMap.set(metric.date, existing)
      })

      // Calculate totals for each date
      dateMap.forEach((aggregated, date) => {
        aggregated.totals = this.calculateTotals(aggregated)
        results.push(aggregated)
      })

      return results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'PlatformAggregator', organizationId, propertyId },
      })
      throw error
    }
  }

  async getChannelPerformance(
    organizationId: string,
    propertyId: string,
    days: number = 30
  ): Promise<ChannelPerformance[]> {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const aggregated = await this.aggregateMetrics(organizationId, propertyId, startDate, endDate)

      // Calculate average metrics per platform
      const platforms = ['google', 'airbnb', 'booking', 'vrbo', 'flatio'] as const

      return platforms.map((platform) => {
        const metrics = aggregated
          .filter((a) => a[platform] && a[platform].impressions > 0)
          .map((a) => a[platform])

        if (metrics.length === 0) {
          return {
            platform,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
            ctr: 0,
            conversionRate: 0,
            trend: 'stable' as const,
            trendPercent: 0,
          }
        }

        const avgImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0) / metrics.length
        const avgClicks = metrics.reduce((sum, m) => sum + m.clicks, 0) / metrics.length
        const avgConversions = metrics.reduce((sum, m) => sum + m.conversions, 0) / metrics.length
        const avgRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0) / metrics.length

        // Calculate trend (first half vs second half)
        const midpoint = Math.floor(metrics.length / 2)
        const firstHalf = metrics.slice(0, midpoint)
        const secondHalf = metrics.slice(midpoint)

        const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.conversions, 0) / Math.max(1, firstHalf.length)
        const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.conversions, 0) / Math.max(1, secondHalf.length)
        const trendPercent = ((secondHalfAvg - firstHalfAvg) / Math.max(1, firstHalfAvg)) * 100

        return {
          platform,
          impressions: Math.round(avgImpressions),
          clicks: Math.round(avgClicks),
          conversions: Math.round(avgConversions),
          revenue: Math.round(avgRevenue),
          ctr: avgImpressions > 0 ? Math.round((avgClicks / avgImpressions) * 100 * 100) / 100 : 0,
          conversionRate: avgClicks > 0 ? Math.round((avgConversions / avgClicks) * 100 * 100) / 100 : 0,
          trend: trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable',
          trendPercent: Math.round(trendPercent),
        }
      })
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'PlatformAggregator', method: 'getChannelPerformance' },
      })
      throw error
    }
  }

  private async fetchGoogleMetrics(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PlatformMetrics[]> {
    const { data } = await this.getSupabase()
      .from('google_performance_metrics')
      .select('*')
      .eq('property_id', propertyId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    return (
      (data as any)?.map((m: any) => ({
        platform: 'google' as const,
        propertyId,
        date: m.date,
        impressions: m.impressions || 0,
        clicks: m.clicks || 0,
        conversions: m.conversions || 0,
        ctr: m.ctr || 0,
        conversionRate: m.conversion_rate || 0,
      })) || []
    )
  }

  private async fetchAirbnbMetrics(
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PlatformMetrics[]> {
    // Would fetch from airbnb_booking_metrics or similar table
    // Placeholder for actual implementation
    return []
  }

  private async fetchBookingMetrics(
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PlatformMetrics[]> {
    // Would fetch from booking_metrics or similar table
    return []
  }

  private async fetchVrboMetrics(
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PlatformMetrics[]> {
    // Would fetch from vrbo_metrics or similar table
    return []
  }

  private async fetchFlatioMetrics(
    organizationId: string,
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<PlatformMetrics[]> {
    // Would fetch from flatio_metrics or similar table
    return []
  }

  private createEmptyAggregation(date: string): AggregatedMetrics {
    return {
      date,
      google: { platform: 'google', propertyId: '', date, impressions: 0, clicks: 0, conversions: 0 },
      airbnb: { platform: 'airbnb', propertyId: '', date, impressions: 0, clicks: 0, conversions: 0 },
      booking: { platform: 'booking', propertyId: '', date, impressions: 0, clicks: 0, conversions: 0 },
      vrbo: { platform: 'vrbo', propertyId: '', date, impressions: 0, clicks: 0, conversions: 0 },
      flatio: { platform: 'flatio', propertyId: '', date, impressions: 0, clicks: 0, conversions: 0 },
      totals: { impressions: 0, clicks: 0, conversions: 0, revenue: 0, avgCtr: 0, avgConversionRate: 0 },
    }
  }

  private calculateTotals(aggregated: AggregatedMetrics) {
    const totalImpressions =
      (aggregated.google?.impressions || 0) +
      (aggregated.airbnb?.impressions || 0) +
      (aggregated.booking?.impressions || 0) +
      (aggregated.vrbo?.impressions || 0) +
      (aggregated.flatio?.impressions || 0)

    const totalClicks =
      (aggregated.google?.clicks || 0) +
      (aggregated.airbnb?.clicks || 0) +
      (aggregated.booking?.clicks || 0) +
      (aggregated.vrbo?.clicks || 0) +
      (aggregated.flatio?.clicks || 0)

    const totalConversions =
      (aggregated.google?.conversions || 0) +
      (aggregated.airbnb?.conversions || 0) +
      (aggregated.booking?.conversions || 0) +
      (aggregated.vrbo?.conversions || 0) +
      (aggregated.flatio?.conversions || 0)

    const totalRevenue =
      (aggregated.google?.revenue || 0) +
      (aggregated.airbnb?.revenue || 0) +
      (aggregated.booking?.revenue || 0) +
      (aggregated.vrbo?.revenue || 0) +
      (aggregated.flatio?.revenue || 0)

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
      revenue: totalRevenue,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgConversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    }
  }
}

export const platformAggregator = new PlatformAggregator()
