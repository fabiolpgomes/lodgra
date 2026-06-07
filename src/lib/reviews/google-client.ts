/**
 * Google My Business Reviews API Client
 * Fetches property reviews from Google My Business API
 */

import { GoogleAuth } from 'google-auth-library'

export interface GoogleReview {
  reviewer_name: string
  rating: number // 1-5 scale (convert to 1-10 if needed)
  comment: string
  review_date: string // ISO date
  source: 'google'
}

interface GoogleAPIResponse {
  reviews?: Array<{
    name?: string
    reviewer?: {
      displayName?: string
    }
    starRating?: number
    comment?: string
    createTime?: string
  }>
  nextPageToken?: string
}

export class GoogleClient {
  private auth: GoogleAuth
  private baseUrl = 'https://mybusiness.googleapis.com/v4'
  private retryAttempts = 3
  private retryDelay = 1000 // ms

  constructor(keyFilePath: string) {
    if (!keyFilePath) {
      throw new Error('Google service account keyFilePath is required')
    }
    this.auth = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/business.manage'],
    })
  }

  /**
   * Validate that credentials are working (test call to Google API)
   * Should be called during app startup to fail fast if credentials are invalid
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const client = await this.auth.getClient()
      const response = await client.request({
        url: `${this.baseUrl}/accounts`,
        method: 'GET',
        timeout: 5000,
      })

      if (response.status === 200 || response.status === 404) {
        // 200 = success, 404 = no accounts (but credentials valid)
        return true
      }

      throw new Error(`Unexpected response status: ${response.status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Google Service Account validation failed: ${message}`)
    }
  }

  /**
   * Fetch reviews for a location from Google My Business
   */
  async fetchReviews(accountId: string, locationId: string, limit = 100): Promise<GoogleReview[]> {
    const url = `${this.baseUrl}/accounts/${accountId}/locations/${locationId}/reviews?pageSize=${limit}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const client = await this.auth.getClient()
        const response = await client.request({
          url,
          method: 'GET',
          timeout: 30000, // 30s timeout
        })

        const data = response.data as GoogleAPIResponse
        return this.normalizeReviews(data.reviews || [])
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)) // exponential backoff
        }
      }
    }

    throw new Error(
      `Failed to fetch Google My Business reviews after ${this.retryAttempts} attempts: ${lastError?.message}`
    )
  }

  /**
   * Normalize Google My Business reviews to standard format
   */
  private normalizeReviews(reviews: Array<{ reviewer?: { displayName?: string }; starRating?: number; comment?: string; createTime?: string }>): GoogleReview[] {
    return reviews.map((review) => ({
      reviewer_name: review.reviewer?.displayName || 'Anonymous',
      rating: this.normalizeRating(review.starRating || 0),
      comment: review.comment || '',
      review_date: review.createTime ? new Date(review.createTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      source: 'google' as const,
    }))
  }

  /**
   * Normalize Google rating (1-5) to 1-10 scale
   */
  private normalizeRating(rating: number): number {
    return Math.round((rating / 5) * 10 * 2) / 2 // Round to nearest 0.5
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
