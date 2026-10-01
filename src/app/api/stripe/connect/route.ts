import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { CONNECT_COUNTRIES, refreshConnectStatus } from '@/lib/stripe/connect'
import { isPlatformStripeConfigured } from '@/lib/stripe/platform'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // País sugerido a partir da moeda da organização: EUR → Portugal, BRL → Brasil
    const { data: org } = await createAdminClient()
      .from('organizations')
      .select('billing_currency')
      .eq('id', auth.organizationId)
      .maybeSingle()
    const preferred = org?.billing_currency === 'eur' ? 'PT' : org?.billing_currency === 'brl' ? 'BR' : null
    const defaultCountry = countries.find(c => c.code === preferred)?.code ?? countries[0]?.code ?? null

    return NextResponse.json({
      status: connect?.status ?? 'none',
      hasAccount: !!connect?.accountId,
      detailsSubmitted: connect?.detailsSubmitted ?? false,
      countries,
      defaultCountry,
    })
  } catch (err) {
    console.error('[connect] status', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Não foi possível consultar o Stripe' }, { status: 502 })
  }
}
