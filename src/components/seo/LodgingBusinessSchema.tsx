/**
 * Server Component: LodgingBusiness JSON-LD Schema Injector
 * Renders structured data as <script type="application/ld+json"> in document head
 */

import React from 'react'
import { generateLodgingBusinessJsonLd } from '@/lib/seo/lodgingBusinessSchema'

interface PropertyData {
  name: string
  description?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  postal_code?: string | null
  photos?: string[] | null
  imageUrls?: string[]
  base_price?: number | null
  currency?: string | null
  min_nights?: number | null
  max_guests?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  slug?: string | null
  property_type?: string | null
  checkin_from?: string | null
  checkin_until?: string | null
  checkout_until?: string | null
  cleaning_fee?: number | null
  cleaning_fee_type?: string | null
  pet_fee?: number | null
  pet_fee_type?: string | null
  latitude?: number | null
  longitude?: number | null
  structuredAmenities?: { name: string; icon?: string; category?: string }[]
  reviewScore?: { globalAvg: number; totalCount: number } | null
  featuredReviews?: {
    reviewer_name?: string | null
    rating: number
    source: string
    comment?: string | null
    review_date?: string | null
  }[] | null
  telephone?: string | null
  locale?: string
}

interface LodgingBusinessSchemaProps {
  property: PropertyData
}

export function LodgingBusinessSchema({
  property,
}: LodgingBusinessSchemaProps) {
  const jsonLd = generateLodgingBusinessJsonLd(property)
  const jsonString = JSON.stringify(jsonLd)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
      suppressHydrationWarning
    />
  )
}
