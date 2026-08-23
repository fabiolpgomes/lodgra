function normalizeOriginHost(host: string): string {
  return host.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function inferProtocol(host: string, forwardedProto?: string | null): 'http' | 'https' {
  if (forwardedProto === 'http' || forwardedProto === 'https') {
    return forwardedProto
  }

  const normalizedHost = normalizeOriginHost(host)
  if (normalizedHost.startsWith('localhost') || normalizedHost.startsWith('127.0.0.1')) {
    return 'http'
  }

  return 'https'
}

export function getLoyaltyDashboardOrigin(
  headers: Pick<Headers, 'get'>
): string {
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || headers.get('host')?.split(',')[0]?.trim() || ''
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || null

  if (host) {
    const protocol = inferProtocol(host, forwardedProto)
    return `${protocol}://${normalizeOriginHost(host)}`
  }

  return (process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io').replace(/\/$/, '')
}

export function buildLoyaltyStatsUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/dashboard/loyalty/stats`
}
