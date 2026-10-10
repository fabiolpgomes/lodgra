import { NextResponse } from 'next/server'
import { resolvePlatformAdmin } from '@/lib/auth/platform-admin'

export const dynamic = 'force-dynamic'

/**
 * Diz ao menu se deve mostrar o item "Plataforma". É só conveniência de UI:
 * a segurança real está em requirePlatformAdmin() em cada página e rota.
 */
export async function GET() {
  const resolution = await resolvePlatformAdmin()

  if (resolution.status === 'unauthenticated') {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (resolution.status === 'error') {
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
  }
  return NextResponse.json({ isPlatformAdmin: resolution.status === 'ok' })
}
