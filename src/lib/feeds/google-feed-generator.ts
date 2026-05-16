/**
 * Google Vacation Rentals Feed Generator
 * Generates valid XML feeds for Google's Vacation Rentals partner program
 */

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { aggregatePropertyReviews, type PropertyReviewsAggregate } from './review-aggregator'

export interface FeedOptions {
  limit?: number
  offset?: number
  updated_since?: string
  currency?: string
  include_reviews?: boolean
}

interface Property {
  id: string
  name: string
  description: string
  slug: string
  address: string
  city: string
  zipcode: string
  country: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  updated_at?: string
}

interface PropertyMedia {
  url: string
  alt?: string
}

interface PropertyReview {
  rating: number
  review_count: number
}

/**
 * Generate Google Vacation Rentals XML feed
 */
export async function generateGoogleVacationRentalsFeed(
  options: FeedOptions = {}
): Promise<{ xml: string; eTag: string; count: number }> {
  const limit = Math.min(options.limit || 100, 1000)
  const offset = options.offset || 0
  const currency = options.currency || 'EUR'
  const includeReviews = options.include_reviews !== false // Default: true

  const supabase = createAdminClient()

  // Fetch properties with filters
  let query = supabase
    .from('properties')
    .select('id, name, description, slug, address, city, zipcode, country, phone, email, latitude, longitude, updated_at')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options.updated_since) {
    query = query.gte('updated_at', options.updated_since)
  }

  const { data: properties, error } = await query

  if (error || !properties) {
    throw new Error(`Failed to fetch properties: ${error?.message}`)
  }

  // Fetch related data for each property
  const enrichedProperties = await Promise.all(
    properties.map(async (prop) => {
      const [{ data: images }, reviewResult, aggregatedReviews] = await Promise.all([
        supabase.from('property_media').select('url, alt').eq('property_id', prop.id).limit(5),
        supabase
          .from('property_reviews')
          .select('rating, review_count')
          .eq('property_id', prop.id)
          .single(),
        includeReviews ? aggregatePropertyReviews(prop.id) : Promise.resolve(null),
      ])

      const reviews = reviewResult.data || { rating: 0, review_count: 0 }

      return {
        property: prop,
        images: images || [],
        review: reviews,
        aggregatedReviews,
      }
    })
  )

  // Generate XML feed
  const now = new Date().toISOString()
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:gd="http://schemas.google.com/g/2005" xmlns:georss="http://www.georss.org/georss" xmlns:property="http://www.google.com/feeds/property">\n`
  xml += `  <title>Lodgra Property Feed</title>\n`
  xml += `  <link href="https://lodgra.app" rel="alternate"/>\n`
  xml += `  <updated>${now}</updated>\n`
  xml += `  <id>urn:lodgra:feed:properties</id>\n`

  for (const { property, images, review, aggregatedReviews } of enrichedProperties) {
    xml += generateFeedEntry(property, images, review, aggregatedReviews, currency)
  }

  xml += `</feed>\n`

  // Generate ETag from content hash
  const eTag = crypto.createHash('md5').update(xml).digest('hex')

  return { xml, eTag, count: properties.length }
}

/**
 * Generate individual feed entry for property
 */
function generateFeedEntry(
  property: Property,
  images: PropertyMedia[],
  review: PropertyReview,
  aggregatedReviews: PropertyReviewsAggregate | null,
  currency: string
): string {
  const baseUrl = 'https://lodgra.app'
  const lat = property.latitude || 0
  const lon = property.longitude || 0
  const price = currency === 'EUR' ? 150 : currency === 'USD' ? 165 : 600 // Example conversion

  let entry = `  <entry>\n`
  entry += `    <id>urn:lodgra:property:${property.id}</id>\n`
  entry += `    <title>${escapeXml(property.name)}</title>\n`
  entry += `    <content type="xhtml">\n`
  entry += `      <div xmlns="http://www.w3.org/1999/xhtml">\n`
  entry += `        <p>${escapeXml(property.description.substring(0, 500))}</p>\n`
  entry += `      </div>\n`
  entry += `    </content>\n`
  entry += `    <link href="${baseUrl}/p/${property.slug}" rel="alternate"/>\n`

  // Add images (max 5)
  images.slice(0, 5).forEach((img) => {
    entry += `    <link href="${escapeXml(img.url)}" rel="image"/>\n`
  })

  entry += `    <author>\n`
  entry += `      <name>Lodgra Property</name>\n`
  entry += `    </author>\n`
  entry += `    <updated>${property.updated_at || new Date().toISOString()}</updated>\n`

  // Rating (if available)
  if (review.rating > 0) {
    entry += `    <gd:rating average="${review.rating.toFixed(1)}" min="1" max="5"/>\n`
  }

  // Price
  entry += `    <gd:money amount="${price.toFixed(2)}" currencyCode="${currency}"/>\n`

  // Geolocation
  if (lat && lon) {
    entry += `    <georss:point>${lat} ${lon}</georss:point>\n`
  }

  // Address
  entry += `    <property:address>\n`
  entry += `      <property:streetAddress>${escapeXml(property.address)}</property:streetAddress>\n`
  entry += `      <property:city>${escapeXml(property.city)}</property:city>\n`
  entry += `      <property:postalCode>${escapeXml(property.zipcode || '')}</property:postalCode>\n`
  entry += `      <property:country>${escapeXml(property.country)}</property:country>\n`
  entry += `    </property:address>\n`

  // Check-in/out times
  entry += `    <property:checkInTime>14:00</property:checkInTime>\n`
  entry += `    <property:checkOutTime>11:00</property:checkOutTime>\n`

  // Reviews section (if aggregated reviews available)
  if (aggregatedReviews && aggregatedReviews.reviews.length > 0) {
    entry += `    <reviews>\n`

    // Individual reviews (max 5 most recent)
    aggregatedReviews.reviews.slice(0, 5).forEach((review) => {
      entry += `      <review>\n`
      entry += `        <rating>${review.rating}</rating>\n`
      entry += `        <source>${escapeXml(review.source)}</source>\n`
      entry += `        <text>${escapeXml(review.text.substring(0, 200))}</text>\n`
      entry += `        <author>${escapeXml(review.author)}</author>\n`
      entry += `        <date>${review.date}</date>\n`
      entry += `      </review>\n`
    })

    // Aggregate rating
    entry += `      <aggregateRating>\n`
    entry += `        <average>${aggregatedReviews.aggregateRating.average}</average>\n`
    entry += `        <count>${aggregatedReviews.aggregateRating.count}</count>\n`
    entry += `        <bestRating>${aggregatedReviews.aggregateRating.bestRating}</bestRating>\n`
    entry += `        <worstRating>${aggregatedReviews.aggregateRating.worstRating}</worstRating>\n`
    entry += `      </aggregateRating>\n`
    entry += `    </reviews>\n`
  }

  entry += `  </entry>\n`

  return entry
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validate feed against basic XML structure
 */
export function validateFeedStructure(xml: string | null): boolean {
  try {
    if (!xml || typeof xml !== 'string') return false
    // Check for XML declaration
    if (!xml.includes('<?xml')) return false
    // Check for feed root element opening
    if (!xml.match(/<feed[^>]*>/)) return false
    // Check for feed root element closing
    if (!xml.includes('</feed>')) return false
    // Count opening and closing tags for basic structure
    const feedOpens = (xml.match(/<feed[^>]*>/g) || []).length
    const feedCloses = (xml.match(/<\/feed>/g) || []).length
    const entryOpens = (xml.match(/<entry>/g) || []).length
    const entryCloses = (xml.match(/<\/entry>/g) || []).length

    // Tags must match
    if (feedOpens !== feedCloses) return false
    if (entryOpens !== entryCloses) return false

    // Feed must close after all entries
    const lastEntryClose = xml.lastIndexOf('</entry>')
    const feedClose = xml.indexOf('</feed>')
    if (lastEntryClose > feedClose && lastEntryClose !== -1) return false

    return true
  } catch {
    return false
  }
}
