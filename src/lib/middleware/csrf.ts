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

  if (origin !== appOrigin) {
    return new NextResponse(
      JSON.stringify({ error: 'Origin não permitida' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return null
}
