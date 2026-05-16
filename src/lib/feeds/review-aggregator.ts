import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      `Missing Supabase environment variables: ${!url ? 'NEXT_PUBLIC_SUPABASE_URL' : ''} ${!key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`.trim()
    )
  }

  return createClient<Database>(url, key)
}

export interface AggregatedReview {
  rating: number
  source: string
  text: string
  author: string
  date: string
}

export interface PropertyReviewsAggregate {
  propertyId: string
  reviews: AggregatedReview[]
  aggregateRating: {
    average: number
    count: number
    bestRating: number
    worstRating: number
  }
}

const ALLOWED_SOURCES = ['booking', 'airbnb']
const MIN_RATING = 4.0

/**
 * Extracts and aggregates reviews for a property
 * Filters by rating >= 4.0 and source in allowed list (Booking.com, Airbnb)
 */
export async function aggregatePropertyReviews(
  propertyId: string
): Promise<PropertyReviewsAggregate | null> {
  try {
    const supabase = getSupabaseClient()
    const { data: reviews, error } = await supabase
      .from('property_reviews')
      .select('rating, source, review_text, reviewer_name, review_date')
      .eq('property_id', propertyId)
      .gte('rating', MIN_RATING)
      .in('source', ALLOWED_SOURCES)
      .limit(5)
      .order('review_date', { ascending: false })

    if (error) {
      console.error(`Error fetching reviews for property ${propertyId}:`, error)
      return null
    }

    if (!reviews || reviews.length === 0) {
      return {
        propertyId,
        reviews: [],
        aggregateRating: {
          average: 0,
          count: 0,
          bestRating: 0,
          worstRating: 0,
        },
      }
    }

    // Map reviews to AggregatedReview format
    const aggregatedReviews: AggregatedReview[] = reviews.map((review) => ({
      rating: review.rating,
      source: review.source,
      text: review.review_text || '',
      author: review.reviewer_name,
      date: review.review_date,
    }))

    // Calculate aggregate rating
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10

    return {
      propertyId,
      reviews: aggregatedReviews,
      aggregateRating: {
        average: averageRating,
        count: reviews.length,
        bestRating: 5,
        worstRating: 1,
      },
    }
  } catch (err) {
    console.error(`Exception while aggregating reviews for ${propertyId}:`, err)
    return null
  }
}

/**
 * Extracts reviews for multiple properties
 */
export async function aggregateMultiplePropertyReviews(
  propertyIds: string[]
): Promise<Map<string, PropertyReviewsAggregate>> {
  const results = new Map<string, PropertyReviewsAggregate>()

  // Use Promise.all for parallel fetching
  const aggregates = await Promise.all(
    propertyIds.map((id) => aggregatePropertyReviews(id))
  )

  aggregates.forEach((aggregate, index) => {
    if (aggregate) {
      results.set(propertyIds[index], aggregate)
    }
  })

  return results
}
