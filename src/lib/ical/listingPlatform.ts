interface ListingPlatformInfo {
  name?: string | null
  display_name?: string | null
}

/** Resolves the canonical provider slug from a property-listing relation. */
export function normalizeListingPlatform(platform: unknown): string | null {
  const value = platform as ListingPlatformInfo | null
  const label = `${value?.name || ''} ${value?.display_name || ''}`.toLowerCase()

  for (const candidate of ['booking', 'airbnb', 'vrbo', 'flatio']) {
    if (label.includes(candidate)) return candidate
  }

  return null
}
