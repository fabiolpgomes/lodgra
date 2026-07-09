/**
 * Mapear nome da plataforma para prefixo de external_id
 * Usado para construir external_id estável em formato: 'plataforma_numero'
 */
export function getPlatformPrefix(platformName: string): string {
  const normalized = platformName.toLowerCase()

  if (normalized.includes('booking')) return 'booking'
  if (normalized.includes('airbnb')) return 'airbnb'
  if (normalized.includes('vrbo') || normalized.includes('expedia')) return 'vrbo'
  if (normalized.includes('flatio')) return 'flatio'

  return 'platform'
}

/**
 * Construir external_id a partir do número da reserva e plataforma
 */
export function buildExternalId(reservationNumber: string, platformName: string): string {
  const prefix = getPlatformPrefix(platformName)
  return `${prefix}_${reservationNumber}`
}
