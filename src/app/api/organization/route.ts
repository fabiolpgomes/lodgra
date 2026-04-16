import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/organization — actualizar nome da organização e/ou plano
export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { name, plan } = body

  const updateData: Record<string, string> = { updated_at: new Date().toISOString() }

  if (name && typeof name === 'string' && name.trim()) {
    updateData.name = name.trim()
  }

  if (plan && typeof plan === 'string') {
    const validPlans = ['starter', 'professional', 'business']
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }
    updateData.plan = plan
  }

  if (Object.keys(updateData).length === 1) {
    // Only updated_at, nothing to update
    return NextResponse.json({ error: 'Nenhum campo para actualizar' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('organizations')
    .update(updateData)
    .eq('id', auth.organizationId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
