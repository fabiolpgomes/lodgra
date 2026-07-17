import * as Sentry from '@sentry/nextjs'
import { RankingFactor } from './ranking-analysis'

interface Recommendation {
  id: string
  propertyId: string
  title: string
  description: string
  action: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedImpact: string // "CTR +15%", "Bookings +8%"
  estimatedImpactPercent: number
  effort: 'quick' | 'medium' | 'high' // Time to implement
  category: 'photos' | 'reviews' | 'price' | 'availability' | 'description'
  aiGenerated: boolean
  implemented: boolean
}

interface RecommendationResult {
  propertyId: string
  recommendations: Recommendation[]
  totalPotentialImpact: number // Sum of all impacts if all implemented
  topRecommendation?: Recommendation
  quickWins: Recommendation[] // < 1 hour to implement
  timestamp: string
}

export class RecommendationEngine {
  generateRecommendations(
    propertyId: string,
    factors: RankingFactor[],
    propertyData: Record<string, unknown>
  ): RecommendationResult {
    const recommendations: Recommendation[] = []

    try {
      // Analyze each factor and generate recommendations
      for (const factor of factors) {
        if (factor.score < 3.0) {
          const recs = this.generateForFactor(propertyId, factor, propertyData)
          recommendations.push(...recs)
        }
      }

      // Sort by impact * urgency
      recommendations.sort((a, b) => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 }
        const scoreA = a.estimatedImpactPercent * priorityWeight[a.priority]
        const scoreB = b.estimatedImpactPercent * priorityWeight[b.priority]
        return scoreB - scoreA
      })

      // Calculate total potential impact
      const totalPotentialImpact = recommendations.reduce((sum, r) => sum + r.estimatedImpactPercent, 0)

      // Get top recommendation
      const topRecommendation = recommendations[0]

      // Filter quick wins (< 1 hour + high impact)
      const quickWins = recommendations.filter(
        (r) => r.effort === 'quick' && r.estimatedImpactPercent >= 5
      )

      return {
        propertyId,
        recommendations,
        totalPotentialImpact: Math.min(totalPotentialImpact, 100), // Cap at 100%
        topRecommendation,
        quickWins,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'RecommendationEngine', propertyId },
      })

      return {
        propertyId,
        recommendations: [],
        totalPotentialImpact: 0,
        timestamp: new Date().toISOString(),
      }
    }
  }

  private generateForFactor(
    propertyId: string,
    factor: RankingFactor,
    propertyData: Record<string, unknown>
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    switch (factor.name) {
      case 'photos':
        recommendations.push(...this.generatePhotoRecommendations(propertyId, factor, propertyData))
        break
      case 'reviews':
        recommendations.push(...this.generateReviewRecommendations(propertyId, factor))
        break
      case 'price':
        recommendations.push(...this.generatePriceRecommendations(propertyId, factor))
        break
      case 'availability':
        recommendations.push(...this.generateAvailabilityRecommendations(propertyId, factor))
        break
      case 'description':
        recommendations.push(...this.generateDescriptionRecommendations(propertyId, factor))
        break
    }

    return recommendations
  }

  private generatePhotoRecommendations(
    propertyId: string,
    factor: RankingFactor,
    propertyData: Record<string, unknown>
  ): Recommendation[] {
    const recs: Recommendation[] = []
    const photoCount = Array.isArray(propertyData.photos) ? propertyData.photos.length : 0

    if (photoCount === 0) {
      recs.push({
        id: `${propertyId}-photo-critical`,
        propertyId,
        title: 'Add Photos (Critical)',
        description: 'Properties without photos rarely receive bookings. Add at least 5 high-quality photos.',
        action: 'Upload 5-10 professional photos (bedroom, bathroom, kitchen, living, exterior)',
        priority: 'critical',
        estimatedImpact: 'CTR +200%, Bookings +150%',
        estimatedImpactPercent: 150,
        effort: 'high',
        category: 'photos',
        aiGenerated: true,
        implemented: false,
      })
    } else if (photoCount < 5) {
      recs.push({
        id: `${propertyId}-photo-add`,
        propertyId,
        title: `Add ${5 - photoCount} Photos`,
        description: 'Current: 2-4 photos. Recommend: 5-8 photos for optimal ranking.',
        action: `Add photos of: ${this.getMissingPhotoTypes(photoCount)}`,
        priority: 'high',
        estimatedImpact: 'CTR +40%, Bookings +25%',
        estimatedImpactPercent: 25,
        effort: 'medium',
        category: 'photos',
        aiGenerated: true,
        implemented: false,
      })
    } else if (photoCount < 8) {
      recs.push({
        id: `${propertyId}-photo-enhance`,
        propertyId,
        title: 'Enhance Photo Gallery',
        description: `Current: ${photoCount} photos. Recommend: 8-12 for premium positioning.`,
        action: 'Add exterior, amenities, and detail shots (pool, balcony, workspace)',
        priority: 'medium',
        estimatedImpact: 'CTR +15%, Bookings +8%',
        estimatedImpactPercent: 8,
        effort: 'medium',
        category: 'photos',
        aiGenerated: true,
        implemented: false,
      })
    }

    return recs
  }

  private generateReviewRecommendations(
    propertyId: string,
    factor: RankingFactor
  ): Recommendation[] {
    const recs: Recommendation[] = []

    if (factor.score < 3.0) {
      recs.push({
        id: `${propertyId}-review-improve`,
        propertyId,
        title: 'Improve Guest Experience (Low Rating)',
        description: 'Rating below 3.0 significantly reduces bookings. Focus on cleanliness and communication.',
        action: 'Address guest complaints; improve Wi-Fi, cleaning, amenities',
        priority: 'critical',
        estimatedImpact: 'Bookings +40%',
        estimatedImpactPercent: 40,
        effort: 'high',
        category: 'reviews',
        aiGenerated: true,
        implemented: false,
      })
    } else if (factor.score < 4.0) {
      recs.push({
        id: `${propertyId}-review-boost`,
        propertyId,
        title: 'Boost Rating to 4.0+',
        description: 'Rating at 3.5-4.0. Improve to 4.0+ for top tier positioning.',
        action: 'Request reviews from recent guests; address feedback promptly',
        priority: 'high',
        estimatedImpact: 'Bookings +20%',
        estimatedImpactPercent: 20,
        effort: 'medium',
        category: 'reviews',
        aiGenerated: true,
        implemented: false,
      })
    }

    return recs
  }

  private generatePriceRecommendations(propertyId: string, factor: RankingFactor): Recommendation[] {
    const recs: Recommendation[] = []

    if (factor.gap < -50) {
      // Price is 50+ below avg
      recs.push({
        id: `${propertyId}-price-raise`,
        propertyId,
        title: 'Increase Price to Market Rate',
        description: `Current price is ${Math.round(Math.abs(factor.gap))} below market average.`,
        action: 'Gradually increase price by 5-10% per week to test demand',
        priority: 'high',
        estimatedImpact: 'Revenue +30%, Bookings -2%',
        estimatedImpactPercent: 28,
        effort: 'quick',
        category: 'price',
        aiGenerated: true,
        implemented: false,
      })
    } else if (factor.gap > 50) {
      // Price is 50+ above avg
      recs.push({
        id: `${propertyId}-price-lower`,
        propertyId,
        title: 'Optimize Price (Currently High)',
        description: `Current price is ${Math.round(factor.gap)} above market. Consider competitor analysis.`,
        action: 'Review comparable properties; consider 5-15% discount or add premium amenities',
        priority: 'medium',
        estimatedImpact: 'Bookings +20%',
        estimatedImpactPercent: 20,
        effort: 'quick',
        category: 'price',
        aiGenerated: true,
        implemented: false,
      })
    }

    return recs
  }

  private generateAvailabilityRecommendations(
    propertyId: string,
    factor: RankingFactor
  ): Recommendation[] {
    const recs: Recommendation[] = []

    if (factor.score < 2.5) {
      recs.push({
        id: `${propertyId}-availability-open`,
        propertyId,
        title: 'Open More Dates (Low Availability)',
        description: `Only ${Math.round(factor.score * 20)}% available. Low availability significantly reduces impressions.`,
        action: 'Update calendar to open at least 60%+ of dates for better visibility',
        priority: 'high',
        estimatedImpact: 'Impressions +100%, CTR +30%',
        estimatedImpactPercent: 30,
        effort: 'quick',
        category: 'availability',
        aiGenerated: true,
        implemented: false,
      })
    }

    return recs
  }

  private generateDescriptionRecommendations(
    propertyId: string,
    factor: RankingFactor
  ): Recommendation[] {
    const recs: Recommendation[] = []

    if (factor.score < 2.0) {
      recs.push({
        id: `${propertyId}-description-expand`,
        propertyId,
        title: 'Expand Property Description',
        description: 'Current description is too short. Detailed descriptions improve click-through rate.',
        action: 'Write 150-300 word description including: features, amenities, house rules, tips',
        priority: 'medium',
        estimatedImpact: 'CTR +10%',
        estimatedImpactPercent: 10,
        effort: 'quick',
        category: 'description',
        aiGenerated: true,
        implemented: false,
      })
    }

    return recs
  }

  private getMissingPhotoTypes(current: number): string {
    if (current <= 1) return 'bedroom, bathroom, kitchen, living, exterior'
    if (current === 2) return 'bathroom, kitchen, exterior'
    if (current === 3) return 'kitchen, exterior'
    if (current === 4) return 'exterior, amenities'
    return 'additional amenities'
  }
}

export const recommendationEngine = new RecommendationEngine()
