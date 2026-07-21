export type InboundPlatform = 'airbnb' | 'booking' | 'vrbo'

// PostgreSQL's uuid type accepts legacy UUID-shaped identifiers that do not
// encode an RFC version/variant. Tenant existence is verified by the webhook
// before any email is persisted.
const RECIPIENT_PATTERN = /^reservas\+([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})@([^\s@]+)$/i

export function organizationIdFromRecipient(
  recipients: string[],
  acceptedDomains: string[] = ['lodgra.io']
): string | null {
  const domains = new Set(acceptedDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))

  for (const recipient of recipients) {
    const address = recipient.match(/<([^>]+)>/)?.[1] ?? recipient
    const match = address.trim().match(RECIPIENT_PATTERN)
    if (match && domains.has(match[2].toLowerCase())) return match[1].toLowerCase()
  }
  return null
}

export function platformFromSender(sender: string): InboundPlatform | null {
  const address = (sender.match(/<([^>]+)>/)?.[1] ?? sender).trim().toLowerCase()
  const domain = address.split('@')[1]

  // Airbnb senders: noreply, automated, express, reservations, customer-service
  if (domain === 'airbnb.com' || domain?.endsWith('.airbnb.com')) return 'airbnb'

  // Booking senders: noreply, customer-service, reservations, info
  if (domain === 'booking.com' || domain?.endsWith('.booking.com')) return 'booking'

  // Vrbo senders
  if (domain === 'vrbo.com' || domain?.endsWith('.vrbo.com')) return 'vrbo'

  return null
}
