import {
  generateUnsubscribeToken,
  getPlatformSenderAddress,
  getVerifiedFromEmail,
  verifyUnsubscribeToken,
} from '@/lib/email/security'

describe('email security helpers', () => {
  it('signs and verifies unsubscribe tokens', () => {
    const token = generateUnsubscribeToken('org-123', 'Guest@Example.com')
    const verified = verifyUnsubscribeToken(token)

    expect(verified.valid).toBe(true)
    if (verified.valid) {
      expect(verified.payload.organizationId).toBe('org-123')
      expect(verified.payload.customerEmail).toBe('guest@example.com')
    }
  })

  it('rejects tampered unsubscribe tokens', () => {
    const token = generateUnsubscribeToken('org-123', 'guest@example.com')
    const tampered = `${token.slice(0, -1)}x`

    expect(verifyUnsubscribeToken(tampered).valid).toBe(false)
  })

  it('requires verified from_email domains', () => {
    expect(() => getVerifiedFromEmail('pousada-sol', 'alerts@evil.example')).toThrow(
      /not verified/i,
    )
  })

  describe('remetente', () => {
    const ENV = process.env
    beforeEach(() => {
      process.env = { ...ENV, EMAIL_FROM: 'Lodgra <reservas@lodgra.io>', EMAIL_VERIFIED_FROM_DOMAINS: 'algarvehomestay.pt' }
    })
    afterAll(() => { process.env = ENV })

    it('usa o endereço verificado da plataforma (EMAIL_FROM)', () => {
      expect(getPlatformSenderAddress()).toBe('reservas@lodgra.io')
    })

    it('sem from_email do tenant → plataforma, nunca o subdomínio do tenant', () => {
      expect(getVerifiedFromEmail('algarve-home-stay')).toBe('reservas@lodgra.io')
    })

    it('subdomínio do tenant não verificado é recusado', () => {
      expect(() => getVerifiedFromEmail('algarve-home-stay', 'noreply@algarve-home-stay.lodgra.io')).toThrow(/not verified/i)
    })

    it('aceita domínios verificados no Resend', () => {
      expect(getVerifiedFromEmail('algarve-home-stay', 'reservas@algarvehomestay.pt')).toBe('reservas@algarvehomestay.pt')
    })
  })
})
