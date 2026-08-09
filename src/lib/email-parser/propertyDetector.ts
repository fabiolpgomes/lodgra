import { createAdminClient } from '@/lib/supabase/admin'

interface EmailHeaderData {
  from: string
  subject: string
  to: string
}

/**
 * Extract domain from email address
 * Example: "reservas@airbnb.com" → "airbnb.com"
 */
function extractEmailDomain(email: string): string {
  const match = email.match(/@([^>]+)/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Map email domain to platform ID (UUID)
 * Supports: Airbnb, Booking.com, Vrbo, and custom domains
 */
const PLATFORM_ID_MAP: Record<string, string> = {
  'airbnb': '2c25436a-86b4-4290-b86c-1118b5eae6ea',
  'booking': '43286b7d-88fd-40a1-9cd7-ebf9343cb87c',
  'vrbo': '937650c6-34fe-4e80-9361-b123fc3220d3',
}

function detectPlatformFromDomain(domain: string): string | null {
  if (!domain) return null

  const domain_lower = domain.toLowerCase()

  if (domain_lower.includes('airbnb')) return 'airbnb'
  if (domain_lower.includes('booking')) return 'booking'
  if (domain_lower.includes('vrbo')) return 'vrbo'

  return null
}

/**
 * Auto-detect property_id from email sender domain
 *
 * @param email_from - Email "From" header (e.g., "reservas@airbnb.com")
 * @param organization_id - Organization that owns the property
 * @returns property_id if single match found, null if no match or multiple matches
 */
export async function detectPropertyFromEmailDomain(
  email_from: string,
  organization_id: string
): Promise<string | null> {
  try {
    const domain = extractEmailDomain(email_from)
    const platformName = detectPlatformFromDomain(domain)

    if (!platformName) {
      console.log(`[propertyDetector] Unknown email domain: ${domain}`)
      return null
    }

    const platformId = PLATFORM_ID_MAP[platformName]
    if (!platformId) {
      console.log(`[propertyDetector] Platform name not in map: ${platformName}`)
      return null
    }

    console.log(`[propertyDetector] Detected platform: ${platformName} (${platformId}) from domain: ${domain}`)

    console.log(`[propertyDetector] DEBUG: About to create Supabase admin client`)
    const supabase = await createAdminClient()
    console.log(`[propertyDetector] DEBUG: Admin client created successfully`)

    // Query property_listings with this platform_id and organization
    console.log(`[propertyDetector] DEBUG: Querying property_listings with platformId=${platformId}`)
    const { data: allListings, error } = await supabase
      .from('property_listings')
      .select('id, property_id, platform_id, ical_url')
      .eq('platform_id', platformId)
      .eq('sync_enabled', true)

    console.log(`[propertyDetector] DEBUG: Query result - error=${error ? 'YES' : 'NO'}, listings_count=${allListings?.length || 0}`)
    if (error) {
      console.error(`[propertyDetector] ERROR querying listings:`, JSON.stringify(error))
      return null
    }

    if (!allListings) {
      console.log(`[propertyDetector] DEBUG: allListings is null or undefined`)
      return null
    }

    console.log(`[propertyDetector] DEBUG: Got ${allListings.length} raw listings, checking ical_url validity`)
    // Filter for listings with valid ical_url (in-memory filtering)
    const listings = allListings.filter(l => {
      const hasUrl = l.ical_url && l.ical_url.trim() !== ''
      if (!hasUrl) {
        console.log(`[propertyDetector] DEBUG: Filtering out listing ${l.id} - ical_url invalid`)
      }
      return hasUrl
    })

    console.log(`[propertyDetector] DEBUG: After filtering: ${listings.length} listings with valid ical_url`)

    if (!listings || listings.length === 0) {
      console.log(`[propertyDetector] No property_listings found for platform: ${platformName} (or all filtered out by ical_url)`)
      return null
    }

    // If single match found, use it
    if (listings.length === 1) {
      console.log(`[propertyDetector] ✅ Single match found: property_id=${listings[0].property_id}, listing_id=${listings[0].id}`)
      return listings[0].property_id
    }

    // Multiple matches: try to narrow by organization
    const { data: org_properties } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organization_id)
      .in('id', listings.map(l => l.property_id))

    if (org_properties && org_properties.length === 1) {
      const property_id = org_properties[0].id
      console.log(`[propertyDetector] ✅ Match narrowed by organization: property_id=${property_id}`)
      return property_id
    }

    // Still multiple: return first (user has multiple properties on same platform)
    // This is acceptable for single-property users, but risks misclassification for multi-property users
    const property_id = listings[0].property_id
    console.warn(
      `[propertyDetector] ⚠️ Multiple properties for platform ${platformName} (${listings.length}), using first: property_id=${property_id}`
    )
    return property_id
  } catch (err) {
    console.error(`[propertyDetector] Error detecting property:`, err)
    return null
  }
}

/**
 * Get property_id from organization's sole property (fallback for single-property users)
 *
 * @param organization_id - Organization ID
 * @returns property_id if user has exactly 1 property, null otherwise
 */
export async function getDefaultPropertyIfSingleOwner(
  organization_id: string
): Promise<string | null> {
  try {
    const supabase = await createAdminClient()

    const { data: properties, error } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organization_id)

    if (error || !properties || properties.length !== 1) {
      return null
    }

    console.log(`[propertyDetector] Using default property for single-property owner: ${properties[0].id}`)
    return properties[0].id
  } catch (err) {
    console.error(`[propertyDetector] Error getting default property:`, err)
    return null
  }
}

/**
 * Extract check_in and check_out dates from email body
 * Looks for patterns like:
 * - "Check-in: 2026-08-15"
 * - "Check out: 15/08/2026"
 * - "15 Aug 2026 - 17 Aug 2026"
 */
export function extractDatesFromEmailBody(email_body: string): { check_in: string | null; check_out: string | null } {
  if (!email_body) return { check_in: null, check_out: null }

  // Try ISO format first: 2026-08-15
  const iso_match = email_body.match(/(\d{4}-\d{2}-\d{2})/g)
  if (iso_match && iso_match.length >= 2) {
    return { check_in: iso_match[0], check_out: iso_match[1] }
  }

  // Try DD/MM/YYYY format: 15/08/2026
  const slash_match = email_body.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)
  if (slash_match && slash_match.length >= 2) {
    const parse_date = (date_str: string) => {
      const [day, month, year] = date_str.split('/').map(Number)
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    return { check_in: parse_date(slash_match[0]), check_out: parse_date(slash_match[1]) }
  }

  return { check_in: null, check_out: null }
}
