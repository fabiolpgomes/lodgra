import { NextRequest, NextResponse } from 'next/server'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function checkCsrf(request: NextRequest): NextResponse | null {
  const { pathname, origin: appOrigin } = request.nextUrl

  if (!MUTATION_METHODS.has(request.method)) return null
  if (!pathname.startsWith('/api/')) return null
  if (pathname.startsWith('/api/cron/')) return null

  if (request.headers.get('authorization')?.startsWith('Bearer ')) return null

  const origin = request.headers.get('origin')
  if (!origin) return null

  // Compara com a origem da URL e com o host da requisição. Em dev o Next normaliza
  // nextUrl para localhost:3000, então um subdomínio de tenant
  // (algarve-home-stay.localhost:3000) nunca bateria só com appOrigin.
  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  let originHost: string | null = null
  try {
    originHost = new URL(origin).host
  } catch {
    originHost = null
  }
  const sameHost = originHost !== null && requestHost !== null && originHost === requestHost

  if (origin !== appOrigin && !sameHost) {
    return NextResponse.json({ error: 'Origin não permitida' }, { status: 403 })
  }

  return null
}
