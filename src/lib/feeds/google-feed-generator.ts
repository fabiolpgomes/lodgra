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
  organization_id?: string
  property_ids?: string[]
  base_url?: string
}

interface Property {
  id: string
  organization_id?: string | null
  name: string
  description: string
  slug: string
  address: string
  city: string
  zipcode: string
  country: string
  latitude?: number
  longitude?: number
  updated_at?: string
  min_nights?: number
  cleaning_fee?: number
  pet_fee?: number | null
  check_in_time?: string
  check_out_time?: string
  photos?: unknown
}

interface PropertyMedia {
  url: string
  alt?: string
}

interface PropertyReview {
  rating: number
  review_count: number
}

interface BlockedDate {
  start: string
  end: string
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
  const baseUrl = normalizeBaseUrl(
    options.base_url || process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'
  )

  const supabase = createAdminClient()

  // Fetch properties with filters
  let query = supabase
    .from('properties')
    .select('id, organization_id, name, description, slug, address, city, zipcode:postal_code, country, latitude, longitude, updated_at, min_nights, cleaning_fee, pet_fee, check_in_time:checkin_from, check_out_time:checkout_until, photos')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options.updated_since) {
    query = query.gte('updated_at', options.updated_since)
  }

  if (options.organization_id) {
    query = query.eq('organization_id', options.organization_id)
  }

  if (options.property_ids?.length) {
    query = query.in('id', options.property_ids)
  }

  const { data: properties, error } = await query

  if (error || !properties) {
    throw new Error(`Failed to fetch properties: ${error?.message}`)
  }

  const organizationSlugs = await getOrganizationSlugs(
    supabase,
    properties.map((property) => property.organization_id).filter((id): id is string => Boolean(id))
  )

  // Fetch related data for each property
  const enrichedProperties = await Promise.all(
    properties.map(async (prop) => {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)

      const [{ data: images }, reviewResult, aggregatedReviews, { data: reservations }, { data: amenities }] = await Promise.all([
        supabase
          .from('property_images')
          .select('storage_path, alt_text')
          .eq('property_id', prop.id)
          .order('display_order', { ascending: true })
          .limit(5),
        supabase
          .from('property_reviews')
          .select('rating, review_count')
          .eq('property_id', prop.id)
          .single(),
        includeReviews ? aggregatePropertyReviews(prop.id) : Promise.resolve(null),
        supabase
          .from('reservations')
          .select('check_in, check_out, status')
          .eq('property_id', prop.id)
          .in('status', ['confirmed', 'pending'])
          .lte('check_out', nextYear.toISOString()),
        supabase
          .from('property_amenities')
          .select('amenity_id, amenities(name)')
          .eq('property_id', prop.id),
      ])

      const reviews = reviewResult.data || { rating: 0, review_count: 0 }

      // Calculate blocked dates from reservations
      const blockedDates = (reservations || []).map((res) => ({
        start: res.check_in,
        end: res.check_out,
      }))

      // Extract amenity names
      const amenityNames = (amenities || [])
        .map((a) => {
          const amenity = (a.amenities as unknown) as { name: string } | null
          return amenity?.name || ''
        })
        .filter((name): name is string => name !== '')

      return {
        property: prop,
        images: images ? convertPropertyImagesToMedia(images) : getImagesFromPropertyPhotos(prop.photos),
        review: reviews,
        aggregatedReviews,
        blockedDates,
        amenities: amenityNames,
      }
    })
  )

  // Generate XML feed
  const now = new Date().toISOString()
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:gd="http://schemas.google.com/g/2005" xmlns:georss="http://www.georss.org/georss" xmlns:property="http://www.google.com/feeds/property">\n`
  xml += `  <title>Lodgra Property Feed</title>\n`
  xml += `  <link href="${escapeXml(baseUrl)}" rel="alternate"/>\n`
  xml += `  <updated>${now}</updated>\n`
  xml += `  <id>urn:lodgra:feed:properties</id>\n`

  for (const { property, images, review, aggregatedReviews, blockedDates, amenities } of enrichedProperties) {
    xml += generateFeedEntry(
      property,
      images,
      review,
      aggregatedReviews,
      blockedDates,
      amenities,
      currency,
      getTenantBaseUrl(baseUrl, property.organization_id ? organizationSlugs.get(property.organization_id) : null)
    )
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
  blockedDates: BlockedDate[],
  amenities: string[],
  currency: string,
  baseUrl: string
): string {
  const lat = property.latitude || 0
  const lon = property.longitude || 0
  const price = currency === 'EUR' ? 150 : currency === 'USD' ? 165 : 600 // Example conversion
  const minNights = property.min_nights || 1
  const cleaningFee = property.cleaning_fee || 0
  const petFee = property.pet_fee || null
  const checkInTime = property.check_in_time || '14:00'
  const checkOutTime = property.check_out_time || '11:00'

  let entry = `  <entry>\n`
  entry += `    <id>urn:lodgra:property:${property.id}</id>\n`
  entry += `    <title>${escapeXml(property.name)}</title>\n`
  entry += `    <content type="xhtml">\n`
  entry += `      <div xmlns="http://www.w3.org/1999/xhtml">\n`
  entry += `        <p>${escapeXml((property.description || '').substring(0, 500))}</p>\n`
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

  // Price with fees
  entry += `    <gd:money amount="${price.toFixed(2)}" currencyCode="${currency}"/>\n`
  entry += `    <property:minNights>${minNights}</property:minNights>\n`
  if (cleaningFee > 0) {
    entry += `    <property:cleaningFee amount="${cleaningFee.toFixed(2)}" currencyCode="${currency}"/>\n`
  }
  if (petFee !== null && petFee > 0) {
    entry += `    <property:petFee amount="${petFee.toFixed(2)}" currencyCode="${currency}"/>\n`
  }

  // Geolocation
  if (lat && lon) {
    entry += `    <georss:point>${lat} ${lon}</georss:point>\n`
  }

  // Address
  entry += `    <property:address>\n`
  entry += `      <property:streetAddress>${escapeXml(property.address || '')}</property:streetAddress>\n`
  entry += `      <property:city>${escapeXml(property.city || '')}</property:city>\n`
  entry += `      <property:postalCode>${escapeXml(property.zipcode || '')}</property:postalCode>\n`
  entry += `      <property:country>${escapeXml(property.country || '')}</property:country>\n`
  entry += `    </property:address>\n`

  // Check-in/out times (dynamic)
  entry += `    <property:checkInTime>${checkInTime}</property:checkInTime>\n`
  entry += `    <property:checkOutTime>${checkOutTime}</property:checkOutTime>\n`

  // Amenities
  if (amenities.length > 0) {
    entry += `    <property:amenities>\n`
    amenities.forEach((amenity) => {
      entry += `      <property:amenity>${escapeXml(amenity)}</property:amenity>\n`
    })
    entry += `    </property:amenities>\n`
  }

  // Availability (blocked dates)
  if (blockedDates.length > 0) {
    entry += `    <property:availability>\n`
    blockedDates.forEach((range) => {
      entry += `      <property:blockedRange start="${range.start}" end="${range.end}"/>\n`
    })
    entry += `    </property:availability>\n`
  }

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

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

async function getOrganizationSlugs(
  supabase: ReturnType<typeof createAdminClient>,
  organizationIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(organizationIds)]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('organizations')
    .select('id, slug')
    .in('id', uniqueIds)

  if (error || !data) {
    return new Map()
  }

  return new Map(
    data
      .filter((organization): organization is { id: string; slug: string } => {
        return typeof organization.id === 'string' && typeof organization.slug === 'string'
      })
      .map((organization) => [organization.id, organization.slug])
  )
}

function getTenantBaseUrl(baseUrl: string, organizationSlug?: string | null): string {
  if (!organizationSlug) return baseUrl

  try {
    const url = new URL(baseUrl)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return baseUrl
    }

    const rootHost = url.hostname.replace(/^www\./, '')
    url.hostname = `${organizationSlug}.${rootHost}`
    return normalizeBaseUrl(url.toString())
  } catch {
    return baseUrl
  }
}

function convertPropertyImagesToMedia(images: Array<{ storage_path?: string; alt_text?: string | null }>): PropertyMedia[] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co'
  const storageBucket = 'property-images'

  return images
    .filter((img) => img.storage_path)
    .map((img) => {
      const storagePath = img.storage_path || ''
      const url = `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${storagePath}`
      return {
        url,
        alt: img.alt_text || undefined,
      }
    })
}

function getImagesFromPropertyPhotos(photos: unknown): PropertyMedia[] {
  if (!Array.isArray(photos)) return []

  return photos
    .map((photo) => {
      if (typeof photo === 'string') {
        return { url: photo }
      }

      if (photo && typeof photo === 'object') {
        const candidate = photo as { url?: unknown; src?: unknown; path?: unknown; alt?: unknown }
        const url = candidate.url || candidate.src || candidate.path
        if (typeof url === 'string' && url.length > 0) {
          return {
            url,
            alt: typeof candidate.alt === 'string' ? candidate.alt : undefined,
          }
        }
      }

      return null
    })
    .filter((photo): photo is PropertyMedia => Boolean(photo))
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
