/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReviewAggregator } from '@/lib/reviews/review-aggregator'

describe('ReviewAggregator', () => {
  describe('aggregateReviews', () => {
    it('should merge reviews from multiple sources', () => {
      const bookingReviews = [
        { reviewer_name: 'João', rating: 9, comment: 'Excelente!', review_date: '2026-06-01' },
      ]
      const airbnbReviews = [
        { reviewer_name: 'Maria', rating: 4.5, comment: 'Muito bom', review_date: '2026-06-02' },
      ]
      const googleReviews = [
        { reviewer_name: 'Pedro', rating: 5, comment: 'Maravilhoso!', review_date: '2026-06-03' },
      ]

      const { reviews, stats } = ReviewAggregator.aggregateReviews(bookingReviews, airbnbReviews, googleReviews)

      expect(reviews.length).toBe(3)
      expect(stats.totalReviews).toBe(3)
      expect(stats.reviewsBySource.booking).toBe(1)
      expect(stats.reviewsBySource.airbnb).toBe(1)
      expect(stats.reviewsBySource.google).toBe(1)
    })

    it('should deduplicate reviews', () => {
      const bookingReviews = [
        { reviewer_name: 'João', rating: 9, comment: 'Excelente!', review_date: '2026-06-01' },
      ]
      const airbnbReviews = [
        { reviewer_name: 'João', rating: 4.5, comment: 'Excelente!', review_date: '2026-06-01' }, // Duplicate
      ]

      const { reviews, stats } = ReviewAggregator.aggregateReviews(bookingReviews, airbnbReviews, [])

      expect(reviews.length).toBe(1) // Deduped
      expect(stats.dedupCount).toBe(1)
    })

    it('should handle different rating scales (AirbnbClient normalizes before aggregation)', () => {
      // Airbnb client normalizes ratings before passing to aggregator
      const airbnbReviews = [
        { reviewer_name: 'Maria', rating: 10, comment: 'Perfeito', review_date: '2026-06-01' }, // Already normalized
        { reviewer_name: 'Pedro', rating: 5, comment: 'Ruim', review_date: '2026-06-02' }, // Already normalized
      ]

      const { reviews } = ReviewAggregator.aggregateReviews([], airbnbReviews, [])

      expect(reviews[0].rating).toBe(10)
      expect(reviews[1].rating).toBe(5)
    })

    it('should calculate average rating correctly', () => {
      const bookingReviews = [
        { reviewer_name: 'João', rating: 8, comment: 'Bom', review_date: '2026-06-01' },
        { reviewer_name: 'Maria', rating: 10, comment: 'Excelente', review_date: '2026-06-02' },
      ]

      const { stats } = ReviewAggregator.aggregateReviews(bookingReviews, [], [])

      expect(stats.averageRating).toBe(9) // (8 + 10) / 2 = 9
    })

    it('should handle empty reviews', () => {
      const { reviews, stats } = ReviewAggregator.aggregateReviews([], [], [])

      expect(reviews.length).toBe(0)
      expect(stats.totalReviews).toBe(0)
      expect(stats.averageRating).toBe(0)
    })
  })
})
