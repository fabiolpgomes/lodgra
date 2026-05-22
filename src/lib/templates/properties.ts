import { createClient } from '@/lib/supabase/client'

interface Property {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  price_per_night?: number
}

/**
 * Filter properties by featured_property_ids while preserving order
 *
 * If featured_property_ids is set and non-empty, returns only those properties
 * in the order specified by featured_property_ids.
 *
 * Otherwise returns all properties for the organization.
 */
export function filterPropertiesByTemplate(
  properties: Property[],
  featuredPropertyIds?: string[] | null,
  showAllProperties: boolean = true,
): Property[] {
  // Show all properties if:
  // - showAllProperties is true, OR
  // - featured_property_ids is not set, OR
  // - featured_property_ids is empty
  if (showAllProperties || !featuredPropertyIds || featuredPropertyIds.length === 0) {
    return properties
  }

  // Filter to featured properties only
  const featured = properties.filter((p) => featuredPropertyIds.includes(p.id))

  // Preserve order from featuredPropertyIds array
  // Properties are ordered based on their position in featuredPropertyIds
  return featured.sort(
    (a, b) => featuredPropertyIds.indexOf(a.id) - featuredPropertyIds.indexOf(b.id),
  )
}

/**
 * Fetch properties for an organization with optional template filtering
 *
 * Returns properties filtered by featured_property_ids if provided.
 * Uses batch query to avoid N+1 query problem.
 */
export async function fetchPropertiesForTemplate(
  organizationId: string,
  featuredPropertyIds?: string[] | null,
  showAllProperties: boolean = true,
): Promise<Property[]> {
  const client = createClient()

  // Fetch all properties for the organization
  const { data: allProperties, error } = await client
    .from('properties')
    .select('id, name, slug, description, image_url, price_per_night')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }

  if (!allProperties) {
    return []
  }

  // Apply template filtering
  return filterPropertiesByTemplate(
    allProperties as Property[],
    featuredPropertyIds,
    showAllProperties,
  )
}

/**
 * Validate that all featured_property_ids belong to the organization
 *
 * Used during template PATCH to ensure cross-org data leakage is prevented.
 * Returns {isValid: true} if all IDs belong to org,
 * or {isValid: false, invalidIds: [...]} if not.
 */
export async function validateFeaturedPropertyIds(
  organizationId: string,
  featuredPropertyIds: string[],
): Promise<{ isValid: boolean; invalidIds?: string[] }> {
  if (!featuredPropertyIds || featuredPropertyIds.length === 0) {
    return { isValid: true }
  }

  const client = createClient()

  // Query organization's property IDs
  const { data: orgProperties, error } = await client
    .from('properties')
    .select('id')
    .eq('organization_id', organizationId)
    .in('id', featuredPropertyIds)

  if (error) {
    console.error('Error validating property IDs:', error)
    return { isValid: false, invalidIds: featuredPropertyIds }
  }

  const validIds = new Set((orgProperties || []).map((p) => p.id))
  const invalidIds = featuredPropertyIds.filter((id) => !validIds.has(id))

  if (invalidIds.length > 0) {
    return { isValid: false, invalidIds }
  }

  return { isValid: true }
}
