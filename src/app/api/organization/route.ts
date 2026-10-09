import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOrganizationCurrency, isOrganizationTimeZone } from '@/lib/organization/regional-settings'

// PATCH /api/organization — actualizar nome, plano, fuso horário e/ou moeda da organização
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { name, plan, timezone, currency } = body

  const updateData: Record<string, string> = { updated_at: new Date().toISOString() }

  if (name && typeof name === 'string' && name.trim()) {
    updateData.name = name.trim()
  }

  if (plan && typeof plan === 'string') {
    const validPlans = ['essencial', 'expansao', 'premium']
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }
    updateData.plan = plan
    updateData.subscription_plan = plan
  }

  if (timezone !== undefined) {
    if (!isOrganizationTimeZone(timezone)) {
      return NextResponse.json({ error: 'Fuso horário inválido' }, { status: 400 })
    }
    updateData.timezone = timezone
  }

  if (currency !== undefined) {
    if (!isOrganizationCurrency(currency)) {
      return NextResponse.json({ error: 'Moeda inválida' }, { status: 400 })
    }
    updateData.currency = currency
  }

  if (Object.keys(updateData).length === 1) {
    // Only updated_at, nothing to update
    return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update(updateData)
    .eq('id', auth.organizationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
