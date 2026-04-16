export type Platform = 'airbnb' | 'booking' | 'flatio' | 'unknown'

interface PlatformConfig {
  senders: string[]
  subjectKeywords: string[]
}

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  airbnb: {
    senders: ['automated@airbnb.com', 'express@airbnb.com'],
    subjectKeywords: ['reservation confirmed', 'reserva confirmada', 'booking confirmed', 'new reservation'],
  },
  booking: {
    senders: ['noreply@booking.com', 'customer.service@booking.com'],
    subjectKeywords: ['reservation confirmed', 'reserva confirmada', 'new reservation', 'booking confirmation'],
  },
  flatio: {
    senders: ['noreply@flatio.com', 'info@flatio.com'],
    subjectKeywords: ['reservation confirmed', 'reserva confirmada', 'booking confirmed', 'new booking'],
  },
  unknown: {
    senders: [],
    subjectKeywords: [],
  },
}

export const ALL_KNOWN_SENDERS = Object.values(PLATFORM_CONFIG)
  .flatMap(c => c.senders)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function detectPlatform(from: string, subject: string): Platform | null {
  const fromLower = from.toLowerCase()

  for (const [platform, config] of Object.entries(PLATFORM_CONFIG) as [Platform, PlatformConfig][]) {
    if (platform === 'unknown') continue
    if (config.senders.some(s => fromLower.includes(s))) return platform
  }

  return null
}

/** Verifica se o email é de reserva (remetente + assunto).
 *  Só estes devem ser enviados para a Claude — poupa tokens. */
export function isReservationEmail(from: string, subject: string): boolean {
  const fromLower = from.toLowerCase()
  const subjectLower = subject.toLowerCase()

  for (const [platform, config] of Object.entries(PLATFORM_CONFIG) as [Platform, PlatformConfig][]) {
    if (platform === 'unknown') continue
    const senderMatch = config.senders.some(s => fromLower.includes(s))
    if (!senderMatch) continue
    const subjectMatch = config.subjectKeywords.some(k => subjectLower.includes(k))
    if (subjectMatch) return true
  }

  return false
}
