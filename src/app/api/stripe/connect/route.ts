import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { CONNECT_COUNTRIES, refreshConnectStatus } from '@/lib/stripe/connect'
import { isPlatformStripeConfigured } from '@/lib/stripe/platform'

export const dynamic = 'force-dynamic'

// GET /api/stripe/connect — estado dos pagamentos online da organização
export async function GET() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })

  try {
    const connect = await refreshConnectStatus(auth.organizationId)
    const countries = Object.entries(CONNECT_COUNTRIES)
      .filter(([, c]) => isPlatformStripeConfigured(c.platform))
      .map(([code, c]) => ({ code, label: c.label }))
    return NextResponse.json({
      status: connect?.status ?? 'none',
      hasAccount: !!connect?.accountId,
      countries,
    })
  } catch (err) {
    console.error('[connect] status', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível consultar o Stripe' }, { status: 502 })
  }
}
