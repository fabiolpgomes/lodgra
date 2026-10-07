import type { ICalReservationSource } from './bookingParser'

interface ListingPlatformInfo {
  name?: string | null
  display_name?: string | null
}

/** Resolves the canonical provider slug from a property-listing relation. */
export function normalizeListingPlatform(platform: unknown, feedUrl?: string): ICalReservationSource | null {
  // A provider hostname identifies the transport even when legacy metadata says "manual".
  if (feedUrl) {
    try {
      const hostname = new URL(feedUrl).hostname.toLowerCase()
      const domains = { booking: ['booking.com'], airbnb: ['airbnb.com', 'airbnb.pt', 'abnb.me'], flatio: ['flatio.com'], vrbo: ['vrbo.com', 'homeaway.com'] } as const
      for (const [provider, hosts] of Object.entries(domains)) {
        if (hosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
          return provider as ICalReservationSource
        }
      }
    } catch { /* Unknown or invalid URL: use explicitly configured metadata. */ }
  }
  const value = platform as ListingPlatformInfo | null
  const label = `${value?.name || ''} ${value?.display_name || ''}`.toLowerCase()

  for (const candidate of ['booking', 'airbnb', 'vrbo', 'flatio'] as const) {
    if (label.includes(candidate)) return candidate
  }

  return null
}
