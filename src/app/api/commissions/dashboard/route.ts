/** GET /api/commissions/dashboard: recorded commissions for reviewed reservations. */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { loadCommissionDashboard } from '@/lib/commission/dashboard'

export async function GET() {
  try {
    const auth = await requireRole(['admin'])
    if (!auth.authorized) return auth.response!
    const { organizationId } = auth
    if (!organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })
    const supabase = await createClient()
    const { data: org, error } = await supabase.from('organizations')
      .select('plan').eq('id', organizationId).single()
    if (error) throw new Error(`Commission plan read failed: ${error.code || 'database_error'}`)
    const currentRate = org?.plan
      ? { essencial: 0.2, expansao: 0.15, premium: 0.1, starter: 0.2, professional: 0.15, business: 0.1, growth: 0.15, pro: 0.1 }[org.plan as string] ?? 0.15
      : 0.15
    const dashboard = await loadCommissionDashboard(supabase, organizationId)
    return NextResponse.json({ ...dashboard, currentRate })
  } catch (error) {
    console.error('Commission dashboard error:', error)
    return NextResponse.json({ error: 'Erro ao carregar comissões' }, { status: 500 })
  }
}
