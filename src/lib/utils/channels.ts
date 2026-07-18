const CHANNEL_NAMES: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  'booking.com': 'Booking.com',
  booking_api: 'Booking.com',
  bookingcom: 'Booking.com',
  'booking com': 'Booking.com',
  vrbo: 'VRBO',
  homeaway: 'HomeAway',
  expedia: 'Expedia',
  direct: 'Directo',
  ical_import: 'iCal import',
  ical_auto_sync: 'iCal import',
  manual: 'Manual',
}

export function normalizeChannelName(source: string): string {
  return CHANNEL_NAMES[source.toLowerCase()] ?? source
}
