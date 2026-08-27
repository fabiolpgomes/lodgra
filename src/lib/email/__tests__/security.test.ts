import {
  generateUnsubscribeToken,
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
})
