import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { CONNECT_COUNTRIES, ensureConnectedAccount } from '@/lib/stripe/connect'

export const dynamic = 'force-dynamic'

// POST /api/stripe/connect/account { country } — cria a conta Stripe do tenant
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })

  const { country } = await request.json().catch(() => ({}))
  if (typeof country !== 'string' || !CONNECT_COUNTRIES[country.toUpperCase()]) {
    return NextResponse.json({ error: 'País não suportado' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: org }, { data: profile }] = await Promise.all([
    admin.from('organizations').select('name').eq('id', auth.organizationId).single(),
    admin.from('user_profiles').select('email').eq('id', auth.userId!).single(),
  ])
  if (!org || !profile?.email) {
    return NextResponse.json({ error: 'Dados da organização incompletos' }, { status: 400 })
  }

  try {
    const connect = await ensureConnectedAccount(auth.organizationId, {
      country,
      email: profile.email,
      displayName: org.name,
    })
    return NextResponse.json({ status: connect.status, hasAccount: true })
  } catch (err) {
    const code = err instanceof Error ? err.message : 'unknown'
    console.error('[connect] criar conta', code)
    if (code === 'platform_not_configured') {
      return NextResponse.json({ error: 'Pagamentos online ainda não disponíveis neste país' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Não foi possível criar a conta de pagamentos' }, { status: 502 })
  }
}
