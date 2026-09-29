import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createConnectAccountSession, getOrgConnect } from '@/lib/stripe/connect'
import { getPlatformPublishableKey } from '@/lib/stripe/platform'

export const dynamic = 'force-dynamic'

// POST /api/stripe/connect/session — client_secret para os componentes embutidos do Stripe
export async function POST() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })

  const connect = await getOrgConnect(auth.organizationId)
  if (!connect?.accountId || !connect.platform) {
    return NextResponse.json({ error: 'Conta de pagamentos ainda não criada' }, { status: 400 })
  }
  const publishableKey = getPlatformPublishableKey(connect.platform)
  if (!publishableKey) {
    console.error('[connect] chave publicável não configurada para', connect.platform)
    return NextResponse.json({ error: 'Pagamentos online indisponíveis' }, { status: 500 })
  }

  try {
    const clientSecret = await createConnectAccountSession(connect)
    return NextResponse.json({ clientSecret, publishableKey })
  } catch (err) {
    console.error('[connect] account session', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível abrir o Stripe' }, { status: 502 })
  }
}
