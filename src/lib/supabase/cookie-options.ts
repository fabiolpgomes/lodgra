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

/**
 * Até 26/08/2026 os cookies de sessão eram gravados só para o host (ex.: www.lodgra.io).
 * Desde então vão para o domínio partilhado (.lodgra.io). Quem tem os dois envia dois cookies
 * com o mesmo nome; o servidor pode ler o antigo (já inválido) e a sessão "desaparece":
 * login que não sai do ecrã, "Não autenticado" ao gravar.
 *
 * Devolve cabeçalhos Set-Cookie que apagam APENAS a versão só-do-host (sem Domain),
 * nunca o cookie do domínio partilhado.
 */
export function hostOnlyAuthCookieDeletions(cookieNames: string[], hostname?: string | null): string[] {
  if (!hostname || !getCookieDomain(hostname)) return []
  return cookieNames
    .filter(name => name.startsWith('sb-') && name.includes('-auth-token'))
    .map(name => `${name}=; Path=/; Max-Age=0; Secure; SameSite=Lax`)
}
