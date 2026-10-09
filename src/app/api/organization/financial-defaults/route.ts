import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { financialDefaultsSchema } from '@/lib/financial/financial-defaults'

// PUT /api/organization/financial-defaults — define as predefinições de repasse da organização (só admin)
export async function PUT(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const parsed = financialDefaultsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Predefinições inválidas' }, { status: 400 })
  }

  const adminClient = await createAdminClient()
  const { error } = await adminClient
    .from('organization_financial_settings')
    .upsert({
      organization_id: auth.organizationId,
      default_preset: parsed.data.preset,
      default_recognition_basis: parsed.data.competenciaReceita,
      default_cash_flow_model: parsed.data.fluxoFinanceiro,
      default_cleaning_recipient: parsed.data.destinatarioLimpeza,
      default_municipal_tax_recipient: 'municipality',
    }, { onConflict: 'organization_id' })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível guardar as predefinições' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
