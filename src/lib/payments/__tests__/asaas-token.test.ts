import { generateWebhookToken, lastFour, tokensMatch } from '../asaas-token'

describe('asaas-token', () => {
  it('gera tokens longos e diferentes a cada chamada', () => {
    const a = generateWebhookToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(generateWebhookToken()).not.toBe(a)
  })

  it('tokensMatch só aceita igualdade exata', () => {
    expect(tokensMatch('abc', 'abc')).toBe(true)
    expect(tokensMatch('abc', 'abd')).toBe(false)
    expect(tokensMatch('abc', 'abcd')).toBe(false)
  })

  it('tokensMatch nunca aceita vazio/ausente, mesmo que ambos sejam vazios', () => {
    expect(tokensMatch('', '')).toBe(false)
    expect(tokensMatch(null, null)).toBe(false)
    expect(tokensMatch('abc', null)).toBe(false)
    expect(tokensMatch(undefined, 'abc')).toBe(false)
  })

  it('lastFour mostra só os 4 últimos caracteres', () => {
    expect(lastFour('$aak_secret_1234')).toBe('1234')
    expect(lastFour('abc')).toBeNull()
    expect(lastFour(null)).toBeNull()
  })
})
