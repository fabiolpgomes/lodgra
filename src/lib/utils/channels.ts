const CHANNEL_NAMES: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  'booking.com': 'Booking.com',
  vrbo: 'VRBO',
  homeaway: 'HomeAway',
  expedia: 'Expedia',
  direct: 'Directo',
  manual: 'Manual',
}

export function normalizeChannelName(source: string): string {
  return CHANNEL_NAMES[source.toLowerCase()] ?? source
}
