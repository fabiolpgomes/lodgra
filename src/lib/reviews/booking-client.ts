/**
 * Booking.com Reviews API Client
 * Fetches property reviews from Booking.com via XML feed
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStringPromise } from 'xml2js'

export interface BookingReview {
  reviewer_name: string
  rating: number // 1-10 scale
  comment: string
  review_date: string // ISO date
  source: 'booking'
}

interface BookingXMLReview {
  reviewer_name?: string[]
  rating?: string[]
  comment?: string[]
  review_date?: string[]
}

export class BookingClient {
  private hotelId: string
  private apiKey: string
  private baseUrl = 'https://secure-supply-xml.booking.com/hotels/xml/reviews'
  private retryAttempts = 3
  private retryDelay = 1000 // ms

  constructor(hotelId: string, apiKey: string) {
    if (!hotelId || !apiKey) {
      throw new Error('Booking.com hotelId and apiKey are required')
    }
    this.hotelId = hotelId
    this.apiKey = apiKey
  }

  /**
   * Fetch reviews for a property from Booking.com
   */
  async fetchReviews(propertyId: string, limit = 100): Promise<BookingReview[]> {
    const url = `${this.baseUrl}?hotel_ids=${propertyId}&limit=${limit}`

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${this.hotelId}:${this.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/xml',
          },
          signal: AbortSignal.timeout(30000), // 30s timeout
        })

        if (!response.ok) {
          throw new Error(`Booking.com API error: ${response.status} ${response.statusText}`)
        }

        const xml = await response.text()
        return await this.parseXMLReviews(xml)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt)) // exponential backoff
        }
      }
    }

    throw new Error(
      `Failed to fetch Booking.com reviews after ${this.retryAttempts} attempts: ${lastError?.message}`
    )
  }

  /**
   * Parse XML response from Booking.com
   */
  private async parseXMLReviews(xml: string): Promise<BookingReview[]> {
    try {
      const parsed = await parseStringPromise(xml)
      const reviews = parsed.reviews?.review || []

      return (Array.isArray(reviews) ? reviews : [reviews]).map(
        (review: BookingXMLReview) => ({
          reviewer_name: review.reviewer_name?.[0] || 'Anonymous',
          rating: parseFloat(review.rating?.[0] || '0'),
          comment: review.comment?.[0] || '',
          review_date: review.review_date?.[0] || new Date().toISOString().split('T')[0],
          source: 'booking' as const,
        })
      )
    } catch (error) {
      throw new Error(`Failed to parse Booking.com XML: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
