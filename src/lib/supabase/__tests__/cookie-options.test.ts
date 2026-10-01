import { hostOnlyAuthCookieDeletions } from '../cookie-options'

describe('hostOnlyAuthCookieDeletions', () => {
  const names = ['sb-abc-auth-token.0', 'sb-abc-auth-token.1', 'NEXT_LOCALE', 'sb-abc-auth-token-code-verifier']

  it('apaga só a versão sem Domain dos cookies de sessão, em lodgra.io', () => {
    const headers = hostOnlyAuthCookieDeletions(names, 'www.lodgra.io')
    expect(headers).toEqual([
      'sb-abc-auth-token.0=; Path=/; Max-Age=0; Secure; SameSite=Lax',
      'sb-abc-auth-token.1=; Path=/; Max-Age=0; Secure; SameSite=Lax',
      'sb-abc-auth-token-code-verifier=; Path=/; Max-Age=0; Secure; SameSite=Lax',
    ])
    headers.forEach(h => expect(h).not.toMatch(/Domain=/i))
  })

  it('não mexe em localhost nem em previews', () => {
    expect(hostOnlyAuthCookieDeletions(names, 'localhost:3000')).toEqual([])
    expect(hostOnlyAuthCookieDeletions(names, 'lodgra-git-x.vercel.app')).toEqual([])
    expect(hostOnlyAuthCookieDeletions(names, null)).toEqual([])
  })
})
