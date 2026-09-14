import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

const actionSchema = z.object({ action: z.enum(['confirm', 'block']) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organização indisponível' }, { status: 403 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Reserva inválida' }, { status: 400 })
  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Escolha confirmar reserva ou classificar como bloqueio' }, { status: 400 })
  const supabase = createAdminClient()
  if (!auth.accessAllProperties) {
    const { data: assignments, error: assignmentError } = await supabase.from('user_properties')
      .select('property_id').eq('user_id', auth.userId)
    if (assignmentError) return NextResponse.json({ error: 'Falha ao verificar acesso' }, { status: 500 })
    const { data: accessible, error: lookupError } = await supabase.from('reservations')
      .select('id').eq('id', id).eq('organization_id', auth.organizationId)
      .in('property_id', (assignments || []).map(row => row.property_id)).maybeSingle()
    if (lookupError) return NextResponse.json({ error: 'Falha ao verificar acesso' }, { status: 500 })
    if (!accessible) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }
  const { data, error } = await supabase.rpc('review_ical_pending_reservation', {
    p_organization_id: auth.organizationId, p_reservation_id: id, p_action: parsed.data.action,
  })
  if (error) {
    console.error('[iCal review] Unable to review reservation', error.code)
    return NextResponse.json({ error: 'Não foi possível revisar esta reserva. Atualize a página e tente novamente.' }, {
      status: error.code === 'P0002' ? 404 : error.code === '42501' ? 403 : 409,
    })
  }
  return NextResponse.json({ success: true, result: data })
}
