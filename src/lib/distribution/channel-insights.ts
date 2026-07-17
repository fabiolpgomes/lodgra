import * as Sentry from '@sentry/nextjs'

interface ChannelTip {
  platform: string
  category: 'listings' | 'pricing' | 'reviews' | 'communication' | 'verification'
  title: string
  description: string
  estimatedImpact: string
  priority: 'critical' | 'high' | 'medium'
  action: string
}

interface PlatformInsights {
  platform: string
  status: 'active' | 'underperforming' | 'idle'
  tips: ChannelTip[]
  nextActions: string[]
  benchmarkComparison: string
}

export class ChannelInsights {
  generateInsights(platform: string, metrics: Record<string, any>): PlatformInsights {
    try {
      const status = this.determineStatus(metrics)
      const tips = this.generateTips(platform, metrics)
      const nextActions = this.generateNextActions(platform, status, metrics)
      const benchmarkComparison = this.generateBenchmarkComparison(platform, metrics)

      return {
        platform,
        status,
        tips,
        nextActions,
        benchmarkComparison,
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'ChannelInsights', platform },
      })

      return {
        platform,
        status: 'idle',
        tips: [],
        nextActions: [],
        benchmarkComparison: 'Analysis failed',
      }
    }
  }

  private determineStatus(metrics: Record<string, any>): 'active' | 'underperforming' | 'idle' {
    const conversions = metrics.conversions || 0
    const impressions = metrics.impressions || 0

    if (conversions === 0) return 'idle'
    if (impressions > 0 && (conversions / impressions) * 100 < 0.5) return 'underperforming'
    return 'active'
  }

  private generateTips(platform: string, metrics: Record<string, any>): ChannelTip[] {
    const tips: ChannelTip[] = []

    switch (platform) {
      case 'google':
        tips.push(
          {
            platform: 'google',
            category: 'listings',
            title: 'Add 360° Virtual Tour',
            description: 'Properties with virtual tours get 27% more clicks on Google Vacation Rentals',
            estimatedImpact: 'CTR +27%',
            priority: 'high',
            action: 'Upload 360° tour via Google My Business',
          },
          {
            platform: 'google',
            category: 'pricing',
            title: 'Enable Price Dexterity',
            description: 'Adjust prices dynamically based on demand using Google's tools',
            estimatedImpact: 'Revenue +10-15%',
            priority: 'medium',
            action: 'Enable in Google Merchant Center > Price settings',
          },
          {
            platform: 'google',
            category: 'reviews',
            title: 'Maintain 4.5+ Rating',
            description: 'Properties with 4.5+ rating appear first in search results',
            estimatedImpact: 'Impressions +30%',
            priority: 'critical',
            action: 'Request reviews from recent guests',
          }
        )
        break

      case 'airbnb':
        tips.push(
          {
            platform: 'airbnb',
            category: 'verification',
            title: 'Get Superhost Status',
            description: 'Superhosts get featured listings and higher visibility',
            estimatedImpact: 'Bookings +20%',
            priority: 'high',
            action: 'Maintain 4.8+ rating, quick response (1h), high acceptance rate',
          },
          {
            platform: 'airbnb',
            category: 'listings',
            title: 'Add Amenities & Highlights',
            description: 'Top amenities increase search ranking. Enable "New" and "Superclean"',
            estimatedImpact: 'CTR +15%',
            priority: 'high',
            action: 'Update amenities list, enable badges in settings',
          },
          {
            platform: 'airbnb',
            category: 'reviews',
            title: 'Boost Review Score',
            description: 'Properties with 4.8+ get priority ranking',
            estimatedImpact: 'Ranking +25%',
            priority: 'critical',
            action: 'Send thank you messages, respond to all reviews',
          }
        )
        break

      case 'booking':
        tips.push(
          {
            platform: 'booking',
            category: 'listings',
            title: 'Optimize Property Description',
            description: 'Booking prioritizes detailed, long descriptions (200+ words)',
            estimatedImpact: 'CTR +18%',
            priority: 'high',
            action: 'Expand description with features, amenities, nearby attractions',
          },
          {
            platform: 'booking',
            category: 'pricing',
            title: 'Enable Flexible Cancellation',
            description: 'Free cancellation increases search visibility by 40%',
            estimatedImpact: 'Impressions +40%',
            priority: 'high',
            action: 'Change cancellation policy to "Free cancellation up to X days"',
          },
          {
            platform: 'booking',
            category: 'reviews',
            title: 'Maintain 8.5+ Score',
            description: 'Booking.com prioritizes highly-rated properties',
            estimatedImpact: 'Ranking +20%',
            priority: 'critical',
            action: 'Respond to all reviews, address negative feedback',
          }
        )
        break

      case 'vrbo':
        tips.push(
          {
            platform: 'vrbo',
            category: 'listings',
            title: 'Upload Detailed Photos',
            description: 'VRBO requires minimum 25 photos. More = better ranking',
            estimatedImpact: 'CTR +25%',
            priority: 'high',
            action: 'Upload 25-50 photos of all spaces, amenities, and details',
          },
          {
            platform: 'vrbo',
            category: 'reviews',
            title: 'Build Traveler Reviews',
            description: 'VRBO only shows listings with 5+ reviews in premium positions',
            estimatedImpact: 'Visibility +50%',
            priority: 'critical',
            action: 'Actively request reviews; target 1 review per 3 bookings',
          }
        )
        break

      case 'flatio':
        tips.push(
          {
            platform: 'flatio',
            category: 'listings',
            title: 'Complete Verification',
            description: 'Verified listings get higher ranking and trusted badge',
            estimatedImpact: 'Bookings +15%',
            priority: 'high',
            action: 'Complete ID verification, phone verification, property photos',
          },
          {
            platform: 'flatio',
            category: 'pricing',
            title: 'Offer Flexible Stays',
            description: 'Flatio specializes in flexible rentals (weeks/months)',
            estimatedImpact: 'Bookings +30%',
            priority: 'medium',
            action: 'Enable weekly/monthly pricing discounts (10-20%)',
          }
        )
        break
    }

    return tips
  }

  private generateNextActions(
    platform: string,
    status: string,
    metrics: Record<string, any>
  ): string[] {
    const actions: string[] = []

    if (status === 'idle') {
      actions.push(`Re-enable or optimize ${platform} listing`)
      actions.push('Review pricing and availability')
      actions.push(`Check ${platform} account settings`)
    }

    if (status === 'underperforming') {
      const ctr = metrics.clicks / Math.max(1, metrics.impressions)
      if (ctr < 0.01) {
        actions.push('Update photos (low CTR indicates visibility issue)')
      }
      if (metrics.conversions === 0 && metrics.clicks > 0) {
        actions.push('Improve listing description (high clicks, no bookings)')
      }
      actions.push(`Review ${platform} reviews and address feedback`)
    }

    if (status === 'active') {
      actions.push(`Maintain current quality on ${platform}`)
      actions.push('Continue requesting reviews')
      actions.push('Monitor for booking trends')
    }

    return actions
  }

  private generateBenchmarkComparison(platform: string, metrics: Record<string, any>): string {
    const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
    const conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0

    // Industry benchmarks (simplified)
    const benchmarks: Record<string, { ctr: number; conversion: number }> = {
      google: { ctr: 2.5, conversion: 2.0 },
      airbnb: { ctr: 3.0, conversion: 1.5 },
      booking: { ctr: 2.0, conversion: 1.8 },
      vrbo: { ctr: 2.2, conversion: 1.6 },
      flatio: { ctr: 2.8, conversion: 1.4 },
    }

    const benchmark = benchmarks[platform] || { ctr: 2.0, conversion: 1.5 }

    let comparison = `CTR: ${ctr.toFixed(2)}% (benchmark: ${benchmark.ctr}%) | `
    comparison += `Conversion: ${conversionRate.toFixed(2)}% (benchmark: ${benchmark.conversion}%)`

    if (ctr > benchmark.ctr) {
      comparison += ' ✅ Above industry average'
    } else if (ctr < benchmark.ctr * 0.8) {
      comparison += ' ⚠️ Below industry average'
    }

    return comparison
  }
}

export const channelInsights = new ChannelInsights()
