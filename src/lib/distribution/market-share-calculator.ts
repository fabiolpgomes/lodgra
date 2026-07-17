import * as Sentry from '@sentry/nextjs'

interface MarketShare {
  platform: string
  impressionShare: number // %
  clickShare: number // %
  bookingShare: number // %
  revenueShare: number // %
  ranking: number // 1-5 (best to worst)
}

interface RevenueAttribution {
  platform: string
  directBookings: number
  revenue: number
  averageOrderValue: number
  profitability: 'high' | 'medium' | 'low'
}

interface PlatformMetricsData {
  totals?: {
    impressions?: number
    clicks?: number
    conversions?: number
    revenue?: number
  }
  [platform: string]: {
    impressions?: number
    clicks?: number
    conversions?: number
  } | undefined
}

interface MarketShareAnalysis {
  period: string
  totalImpressions: number
  totalClicks: number
  totalBookings: number
  totalRevenue: number
  platformShares: MarketShare[]
  revenueAttribution: RevenueAttribution[]
  insights: string[]
  recommendations: string[]
}

export class MarketShareCalculator {
  calculateMarketShare(platformMetrics: PlatformMetricsData): MarketShareAnalysis {
    try {
      // Extract platform data
      const platforms = ['google', 'airbnb', 'booking', 'vrbo', 'flatio']
      const totals = platformMetrics.totals || {}

      const totalImpressions = totals.impressions || 1
      const totalClicks = totals.clicks || 1
      const totalConversions = totals.conversions || 1
      const totalRevenue = totals.revenue || 0

      // Calculate market share for each platform
      const platformShares: MarketShare[] = platforms.map((platform, idx) => {
        const platformData = platformMetrics[platform] || {}
        const impressions = platformData.impressions || 0
        const clicks = platformData.clicks || 0
        const conversions = platformData.conversions || 0

        const impressionShare = (impressions / totalImpressions) * 100
        const clickShare = (clicks / totalClicks) * 100
        const bookingShare = (conversions / totalConversions) * 100

        // Revenue share based on platform booking proportion
        const revenueShare = bookingShare // Simplified: revenue share = booking share

        // Ranking by booking share (1 = best, 5 = worst)
        const ranking = idx + 1 // Simplified: based on order

        return {
          platform,
          impressionShare: Math.round(impressionShare * 100) / 100,
          clickShare: Math.round(clickShare * 100) / 100,
          bookingShare: Math.round(bookingShare * 100) / 100,
          revenueShare: Math.round(revenueShare * 100) / 100,
          ranking,
        }
      })

      // Sort by booking share
      platformShares.sort((a, b) => b.bookingShare - a.bookingShare)
      platformShares.forEach((share, idx) => {
        share.ranking = idx + 1
      })

      // Calculate revenue attribution
      const revenueAttribution: RevenueAttribution[] = platformShares.map((share) => {
        const platformRevenue = (share.revenueShare / 100) * totalRevenue
        const bookingsCount = Math.max(1, (share.bookingShare / 100) * totalConversions)
        const aov = platformRevenue / bookingsCount

        return {
          platform: share.platform,
          directBookings: Math.round((share.bookingShare / 100) * totalConversions),
          revenue: Math.round(platformRevenue),
          averageOrderValue: Math.round(aov),
          profitability: aov > 100 ? 'high' : aov > 50 ? 'medium' : 'low',
        }
      })

      // Generate insights
      const insights = this.generateInsights(platformShares, revenueAttribution)

      // Generate recommendations
      const recommendations = this.generateRecommendations(platformShares, revenueAttribution)

      return {
        period: 'last_30_days',
        totalImpressions,
        totalClicks,
        totalBookings: totalConversions,
        totalRevenue,
        platformShares,
        revenueAttribution,
        insights,
        recommendations,
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'MarketShareCalculator' },
      })

      return {
        period: 'last_30_days',
        totalImpressions: 0,
        totalClicks: 0,
        totalBookings: 0,
        totalRevenue: 0,
        platformShares: [],
        revenueAttribution: [],
        insights: ['Analysis failed'],
        recommendations: [],
      }
    }
  }

  private generateInsights(shares: MarketShare[], attribution: RevenueAttribution[]): string[] {
    const insights: string[] = []

    // Top platform
    if (shares.length > 0) {
      const topPlatform = shares[0]
      insights.push(
        `📊 ${topPlatform.platform.toUpperCase()} is your top channel: ${topPlatform.bookingShare.toFixed(1)}% of bookings`
      )
    }

    // Diversification insight
    const topThreeShare = shares.slice(0, 3).reduce((sum, s) => sum + s.bookingShare, 0)
    if (topThreeShare > 80) {
      insights.push(
        `⚠️ Heavy concentration: Top 3 platforms account for ${topThreeShare.toFixed(1)}% of bookings. Consider diversifying.`
      )
    }

    // Underperforming platforms
    const underperformers = shares.filter((s) => s.bookingShare < 5 && s.bookingShare > 0)
    if (underperformers.length > 0) {
      insights.push(
        `📉 ${underperformers.map((s) => s.platform).join(', ')} underperforming (<5% share)`
      )
    }

    // Revenue efficiency
    const highRoiPlatforms = attribution.filter((a) => a.profitability === 'high')
    if (highRoiPlatforms.length > 0) {
      insights.push(
        `💰 High ROI platforms: ${highRoiPlatforms.map((p) => p.platform).join(', ')} (AOV > $100)`
      )
    }

    return insights
  }

  private generateRecommendations(shares: MarketShare[], attribution: RevenueAttribution[]): string[] {
    const recommendations: string[] = []

    // Concentration risk
    const topPlatform = shares[0]
    if (topPlatform?.bookingShare > 50) {
      recommendations.push(
        `Reduce reliance on ${topPlatform.platform}: Invest in secondary channels to reduce risk`
      )
    }

    // Growth opportunity
    const secondPlatform = shares[1]
    if (secondPlatform && topPlatform && topPlatform.impressionShare > secondPlatform.impressionShare) {
      recommendations.push(
        `${secondPlatform.platform.toUpperCase()} has high impression share but low conversion. Optimize listings there.`
      )
    }

    // Underperformer insights
    const underperformers = shares.filter((s) => s.impressionShare > 10 && s.bookingShare < 5)
    if (underperformers.length > 0) {
      underperformers.forEach((platform) => {
        recommendations.push(
          `${platform.platform}: High impressions but low bookings. Review pricing, photos, and description.`
        )
      })
    }

    // Low AOV platforms
    const lowAovPlatforms = attribution.filter((a) => a.profitability === 'low')
    if (lowAovPlatforms.length > 0) {
      recommendations.push(
        `${lowAovPlatforms.map((p) => p.platform).join(', ')}: Low AOV. Consider premium pricing or targeting longer stays.`
      )
    }

    // Idle channels
    const idleChannels = shares.filter((s) => s.bookingShare === 0 && s.impressionShare > 0)
    if (idleChannels.length > 0) {
      recommendations.push(
        `${idleChannels.map((s) => s.platform).join(', ')}: No bookings despite impressions. Consider delisting or major optimization.`
      )
    }

    return recommendations
  }
}

export const marketShareCalculator = new MarketShareCalculator()
