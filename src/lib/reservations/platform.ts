const PLATFORM_LABELS: Record<string, string> = {
  manual: 'MANUAL',
  direct: 'DIRETO',
  ical_import: 'iCal',
  ical_auto_sync: 'iCal',
  booking: 'Booking.com',
  booking_api: 'Booking API',
  airbnb: 'Airbnb',
  flatio: 'Flatio',
  vrbo: 'VRBO',
  email_parse: 'Importado via E-mail',
}

export function getReservationPlatformLabel(platform?: string | null): string {
  if (!platform || platform.trim().length === 0) {
    return PLATFORM_LABELS.manual
  }

  const normalized = platform.trim().toLowerCase()
  return PLATFORM_LABELS[normalized] ?? platform.trim().toUpperCase()
}
