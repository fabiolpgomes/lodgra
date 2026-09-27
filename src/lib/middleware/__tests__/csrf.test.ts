/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server'
import { checkCsrf } from '@/lib/middleware/csrf'

// Objeto mínimo: o jest.setup mocka NextRequest e o Request do ambiente descarta host/origin.
function req(url: string, headers: Record<string, string>, method = 'POST') {
  const u = new URL(url)
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    method,
    nextUrl: { pathname: u.pathname, origin: u.origin },
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
  } as unknown as NextRequest
}

describe('checkCsrf', () => {
  it('permite origin igual à origem da app', () => {
    expect(checkCsrf(req('https://lodgra.io/api/x', { origin: 'https://lodgra.io', host: 'lodgra.io' }))).toBeNull()
  })

  it('permite subdomínio de tenant quando origin e host coincidem (dev normaliza nextUrl)', () => {
    const r = req('http://localhost:3000/api/public/bookings', {
      origin: 'http://algarve-home-stay.localhost:3000',
      host: 'algarve-home-stay.localhost:3000',
    })
    expect(checkCsrf(r)).toBeNull()
  })

  it('bloqueia origin de outro site', () => {
    const r = req('https://lodgra.io/api/x', { origin: 'https://evil.example', host: 'lodgra.io' })
    expect(checkCsrf(r)?.status).toBe(403)
  })

  it('bloqueia origin inválida', () => {
    const r = req('https://lodgra.io/api/x', { origin: 'null', host: 'lodgra.io' })
    expect(checkCsrf(r)?.status).toBe(403)
  })

  it('ignora métodos de leitura', () => {
    expect(checkCsrf(req('https://lodgra.io/api/x', { origin: 'https://evil.example' }, 'GET'))).toBeNull()
  })
})
