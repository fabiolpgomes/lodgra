/**
 * Review Aggregator
 * Merges reviews from multiple sources and deduplicates
 */

import crypto from 'crypto'

export interface AggregatedReview {
  reviewer_name: string
  rating: number // 1-10 scale
  comment: string
  review_date: string // ISO date
  source: 'booking' | 'airbnb' | 'google'
  hash: string // For deduplication
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  reviewsBySource: {
    booking: number
    airbnb: number
    google: number
  }
  dedupCount: number
}

export class ReviewAggregator {
  /**
   * Merge reviews from multiple sources and deduplicate
   */
  static aggregateReviews(
    bookingReviews: any[] = [],
    airbnbReviews: any[] = [],
    googleReviews: any[] = []
  ): { reviews: AggregatedReview[]; stats: ReviewStats } {
    const allReviews = [
      ...bookingReviews.map((r) => ({ ...r, source: 'booking' as const })),
      ...airbnbReviews.map((r) => ({ ...r, source: 'airbnb' as const })),
      ...googleReviews.map((r) => ({ ...r, source: 'google' as const })),
    ]

    // Add hashes for deduplication
    const reviewsWithHash = allReviews.map((r) => ({
      ...r,
      hash: this.generateHash(r.reviewer_name, r.comment, r.review_date),
    }))

    // Deduplicate by hash (keep first occurrence)
    const uniqueReviews = new Map<string, AggregatedReview>()
    for (const review of reviewsWithHash) {
      if (!uniqueReviews.has(review.hash)) {
        uniqueReviews.set(review.hash, review)
      }
    }

    const reviews = Array.from(uniqueReviews.values())
    const dedupCount = allReviews.length - reviews.length

    // Calculate stats
    const stats: ReviewStats = {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10 : 0,
      reviewsBySource: {
        booking: reviews.filter((r) => r.source === 'booking').length,
        airbnb: reviews.filter((r) => r.source === 'airbnb').length,
        google: reviews.filter((r) => r.source === 'google').length,
      },
      dedupCount,
    }

    return { reviews, stats }
  }

  /**
   * Generate hash for deduplication
   * Uses reviewer_name + comment + review_date
   */
  private static generateHash(reviewerName: string, comment: string, reviewDate: string): string {
    const normalized = `${reviewerName.toLowerCase().trim()}|${comment.toLowerCase().trim()}|${reviewDate}`
    return crypto.createHash('sha256').update(normalized).digest('hex')
  }
}
