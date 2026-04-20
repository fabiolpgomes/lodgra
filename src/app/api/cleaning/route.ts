import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_ITEMS = [
  'Trocar roupa de cama',
  'Trocar toalhas',
  'Limpar banheiro completo',
  'Limpar cozinha e fogão',
  'Passar aspirador',
  'Limpar piso',
  'Repor amenities (shampoo, sabonete)',
  'Verificar lâmpadas e tomadas',
  'Recolher lixo',
  'Verificar ar-condicionado/ventilador',
  'Fotografar estado do imóvel',
]

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const propertyId = searchParams.get('property_id')
  const status = searchParams.get('status')
  const date = searchParams.get('date')

  let query = supabase
    .from('cleaning_checklists')
    .select(`
      id, property_id, reservation_id, assigned_to, scheduled_date, status, notes, completed_at, created_at,
      properties(id, name),
      cleaning_checklist_items(id, label, is_done, done_at, position)
    `)
    .order('scheduled_date', { ascending: true })

  if (propertyId) query = query.eq('property_id', propertyId)
  if (status) query = query.eq('status', status)
  if (date) query = query.eq('scheduled_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { property_id, scheduled_date, assigned_to, reservation_id, notes, items } = body

  if (!property_id || !scheduled_date) {
    return NextResponse.json({ error: 'property_id and scheduled_date are required' }, { status: 400 })
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('cleaning_checklists')
    .insert({
      organization_id: profile.organization_id,
      property_id,
      scheduled_date,
      assigned_to: assigned_to || null,
      reservation_id: reservation_id || null,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single()

  if (checklistError) return NextResponse.json({ error: checklistError.message }, { status: 500 })

  // Insert items (use provided items or defaults)
  const itemsToInsert = (items && items.length > 0 ? items : DEFAULT_ITEMS).map(
    (label: string, position: number) => ({
      checklist_id: checklist.id,
      label,
      position,
      is_done: false,
    })
  )

  await supabase.from('cleaning_checklist_items').insert(itemsToInsert)

  return NextResponse.json(checklist, { status: 201 })
}
