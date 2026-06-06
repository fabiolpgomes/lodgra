/**
 * Airbnb Reviews API Client
 * Fetches property reviews from Airbnb API
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AirbnbReview {
  reviewer_name: string
  rating: number // normalized to 1-10 scale
  comment: string
  review_date: string // ISO date
  source: 'airbnb'
}

interface AirbnbAPIResponse {
  reviews?: Array<{
    reviewer?: {
      name?: string
    }
    rating?: number // 1-5 scale
    comments?: string
    created_at?: string
  }>
}

export class AirbnbClient {
  private accessToken: string
  private baseUrl = 'https://api.airbnb.com/v2'
  private retryAttempts = 3
  private retryDelay = 1000 // ms

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error('Airbnb accessToken is required')
    }
    this.accessToken = accessToken
  }

  /**
   * Fetch reviews for a listing from Airbnb
   */
  async fetchReviews(listingId: string, limit = 100): Promise<AirbnbReview[]> {
    const url = `${this.baseUrl}/listings/${listingId}/reviews?access_token=${this.accessToken}&_limit=${limit}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(30000), // 30s timeout
        })

        if (!response.ok) {
          throw new Error(`Airbnb API error: ${response.status} ${response.statusText}`)
        }

        const data: AirbnbAPIResponse = await response.json()
        return this.normalizeReviews(data.reviews || [])
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)) // exponential backoff
        }
      }
    }

    throw new Error(
      `Failed to fetch Airbnb reviews after ${this.retryAttempts} attempts: ${lastError?.message}`
    )
  }

  /**
   * Normalize Airbnb reviews to standard format
   * Converts 1-5 scale to 1-10 scale
   */
  private normalizeReviews(reviews: Array<{ reviewer?: { name?: string }; rating?: number; comments?: string; created_at?: string }>): AirbnbReview[] {
    return reviews.map((review) => ({
      reviewer_name: review.reviewer?.name || 'Anonymous',
      rating: this.normalizeRating(review.rating || 0),
      comment: review.comments || '',
      review_date: review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      source: 'airbnb' as const,
    }))
  }

  /**
   * Normalize Airbnb rating (1-5) to 1-10 scale
   */
  private normalizeRating(rating: number): number {
    return Math.round((rating / 5) * 10 * 2) / 2 // Round to nearest 0.5
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
