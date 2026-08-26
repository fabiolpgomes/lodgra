import type { CookieOptionsWithName } from '@supabase/ssr'

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\d+$/, '')
}

function getCookieDomain(hostname: string): string | null {
  const normalized = normalizeHostname(hostname)

  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return null
  }

  if (normalized === 'lodgra.io' || normalized.endsWith('.lodgra.io')) {
    return '.lodgra.io'
  }

  if (normalized === 'homestay.pt' || normalized.endsWith('.homestay.pt')) {
    return '.homestay.pt'
  }

  return null
}

export function getSupabaseCookieOptions(hostname?: string | null): CookieOptionsWithName | undefined {
  if (!hostname) return undefined

  const domain = getCookieDomain(hostname)
  if (!domain) return undefined

  return {
    domain,
    path: '/',
    sameSite: 'lax',
    secure: true,
  }
}
