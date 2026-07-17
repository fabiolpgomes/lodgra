import * as Sentry from '@sentry/nextjs'

export interface RankingFactor {
  name: 'photos' | 'reviews' | 'price' | 'availability' | 'description'
  score: number // 1-5 scale
  weight: number // importance multiplier
  benchmark: number // market average
  gap: number // score - benchmark
  recommendation?: string
}

interface RankingAnalysis {
  propertyId: string
  overallScore: number // 1-5 weighted
  factors: RankingFactor[]
  competitivePosition: 'top_10' | 'top_25' | 'top_50' | 'below_avg'
  improvementPotential: number // % improvement possible
  timestamp: string
}

interface MarketBenchmarks {
  avgPhotos: number
  avgRating: number
  avgPrice: number
  avgAvailability: number
  avgDescriptionLength: number
}

export class RankingAnalyzer {
  private defaultBenchmarks: MarketBenchmarks = {
    avgPhotos: 8,
    avgRating: 4.5,
    avgPrice: 150,
    avgAvailability: 75,
    avgDescriptionLength: 200,
  }

  async analyzeRanking(
    propertyId: string,
    propertyData: Record<string, unknown>,
    benchmarks?: MarketBenchmarks
  ): Promise<RankingAnalysis> {
    const marks = benchmarks || this.defaultBenchmarks

    try {
      const factors: RankingFactor[] = []

      // Factor 1: Photos
      const photos = Array.isArray(propertyData.photos) ? propertyData.photos.length : 0
      const photoScore = Math.min(5, (photos / marks.avgPhotos) * 5)
      factors.push({
        name: 'photos',
        score: Math.round(photoScore * 10) / 10,
        weight: 1.5, // Very important for CTR
        benchmark: marks.avgPhotos,
        gap: photos - marks.avgPhotos,
        recommendation: this.getPhotoRecommendation(photos),
      })

      // Factor 2: Reviews & Rating
      const rating = (propertyData.rating as number) || 0
      const reviewCount = (propertyData.review_count as number) || 0
      const reviewScore = Math.min(5, (rating / marks.avgRating) * 5)
      factors.push({
        name: 'reviews',
        score: Math.round(reviewScore * 10) / 10,
        weight: 2.0, // Most important for conversion
        benchmark: marks.avgRating,
        gap: rating - marks.avgRating,
        recommendation: this.getReviewRecommendation(rating, reviewCount),
      })

      // Factor 3: Price Competitiveness
      const price = (propertyData.price as number) || 0
      const priceScore = this.calculatePriceScore(price, marks.avgPrice)
      factors.push({
        name: 'price',
        score: Math.round(priceScore * 10) / 10,
        weight: 1.2, // Important for CTR
        benchmark: marks.avgPrice,
        gap: price - marks.avgPrice,
        recommendation: this.getPriceRecommendation(price, marks.avgPrice),
      })

      // Factor 4: Availability
      const availability = (propertyData.availability_percentage as number) || 0
      const availabilityScore = Math.min(5, (availability / marks.avgAvailability) * 5)
      factors.push({
        name: 'availability',
        score: Math.round(availabilityScore * 10) / 10,
        weight: 1.3, // Important for bookings
        benchmark: marks.avgAvailability,
        gap: availability - marks.avgAvailability,
        recommendation: this.getAvailabilityRecommendation(availability),
      })

      // Factor 5: Description Quality
      const description = String(propertyData.description || '')
      const descLength = description.length
      const descScore = Math.min(5, (descLength / marks.avgDescriptionLength) * 5)
      factors.push({
        name: 'description',
        score: Math.round(descScore * 10) / 10,
        weight: 0.8, // Moderate importance
        benchmark: marks.avgDescriptionLength,
        gap: descLength - marks.avgDescriptionLength,
        recommendation: this.getDescriptionRecommendation(descLength),
      })

      // Calculate weighted overall score
      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
      const weightedScore =
        factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight
      const overallScore = Math.round(weightedScore * 10) / 10

      // Determine competitive position
      const competitivePosition = this.determinePosition(overallScore)

      // Calculate improvement potential (%)
      const maxPossible = 5.0
      const improvementPotential = Math.round(((maxPossible - overallScore) / maxPossible) * 100)

      return {
        propertyId,
        overallScore,
        factors,
        competitivePosition,
        improvementPotential,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'RankingAnalyzer', propertyId },
      })
      throw error
    }
  }

  private calculatePriceScore(actualPrice: number, avgPrice: number): number {
    if (actualPrice <= 0) return 1
    if (actualPrice === avgPrice) return 5

    // Prices within 20% of avg are scored best
    const deviation = Math.abs(actualPrice - avgPrice) / avgPrice
    if (deviation <= 0.2) return 5
    if (deviation <= 0.4) return 4
    if (deviation <= 0.6) return 3
    if (deviation <= 0.8) return 2

    return 1
  }

  private getPhotoRecommendation(photoCount: number): string {
    if (photoCount === 0) return 'Add minimum 5 high-quality photos'
    if (photoCount < 5) return `Add ${5 - photoCount} more photos (bedroom, bathroom, kitchen)`
    if (photoCount < 8) return `Add ${8 - photoCount} more photos (exterior, amenities, views)`
    if (photoCount < 12) return 'Consider adding 360° virtual tour'
    return 'Photo coverage is excellent'
  }

  private getReviewRecommendation(rating: number, reviewCount: number): string {
    if (reviewCount === 0) return 'No reviews yet; encourage first guests to leave feedback'
    if (rating < 3.0) return 'Low rating (< 3.0) — address cleanliness and guest experience urgently'
    if (rating < 3.5) return 'Rating below average — improve communication and amenities'
    if (rating < 4.0) return 'Good start; focus on guest experience details'
    if (rating < 4.5) return 'Strong rating; maintain high service quality'
    return 'Excellent rating — leverage in marketing'
  }

  private getPriceRecommendation(actualPrice: number, avgPrice: number): string {
    const deviation = Math.abs(actualPrice - avgPrice) / avgPrice

    if (actualPrice < avgPrice * 0.8) {
      return `Price is ${Math.round(deviation * 100)}% below market — consider raising`
    }
    if (actualPrice > avgPrice * 1.2) {
      return `Price is ${Math.round(deviation * 100)}% above market — consider lowering or adding premium amenities`
    }
    if (actualPrice === avgPrice) {
      return 'Price is competitive with market average'
    }

    return 'Price is in good competitive range'
  }

  private getAvailabilityRecommendation(availability: number): string {
    if (availability < 30) return 'Property rarely available — consider opening more dates'
    if (availability < 50) return 'Availability is low — open more dates for better ranking'
    if (availability < 75) return 'Availability could be higher for better visibility'
    return 'Availability is excellent — maintains good ranking'
  }

  private getDescriptionRecommendation(descLength: number): string {
    if (descLength < 30) return 'Description is too short; add details about features and amenities'
    if (descLength < 100) return 'Expand description with more details about the space'
    if (descLength < 200) return 'Good description; consider adding house rules and tips'
    if (descLength > 5000) return 'Description is very long; consider condensing for readability'
    return 'Description quality is good'
  }

  private determinePosition(score: number): 'top_10' | 'top_25' | 'top_50' | 'below_avg' {
    if (score >= 4.5) return 'top_10'
    if (score >= 4.0) return 'top_25'
    if (score >= 3.5) return 'top_50'
    return 'below_avg'
  }
}

export const rankingAnalyzer = new RankingAnalyzer()
