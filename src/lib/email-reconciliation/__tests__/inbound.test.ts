import { organizationIdFromRecipient, platformFromSender } from '@/lib/email-reconciliation/inbound'

describe('email reconciliation inbound routing', () => {
  const orgId = '275ef1c9-211c-4dad-882d-e3dcfc934590'

  it('extracts the organization UUID from the dedicated recipient', () => {
    expect(organizationIdFromRecipient([`Lodgra <reservas+${orgId}@lodgra.io>`])).toBe(orgId)
  })

  it('rejects recipients outside the dedicated contract', () => {
    expect(organizationIdFromRecipient(['reservas@lodgra.io'])).toBeNull()
    expect(organizationIdFromRecipient([`reservas+${orgId}@evil.test`])).toBeNull()
  })

  it('accepts a configured staging receiving subdomain', () => {
    expect(
      organizationIdFromRecipient(
        [`reservas+${orgId}@inbound.lodgra.io`],
        ['lodgra.io', 'inbound.lodgra.io']
      )
    ).toBe(orgId)
  })

  it.each([
    ['automated@airbnb.com', 'airbnb'],
    ['Booking <noreply@booking.com>', 'booking'],
    ['notifications@messages.vrbo.com', 'vrbo'],
  ])('recognizes allowlisted sender %s', (sender, platform) => {
    expect(platformFromSender(sender)).toBe(platform)
  })

  it('rejects lookalike and unknown sender domains', () => {
    expect(platformFromSender('automated@airbnb.com.evil.test')).toBeNull()
    expect(platformFromSender('spam@example.com')).toBeNull()
  })
})
