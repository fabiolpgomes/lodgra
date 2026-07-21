import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  > }
) {
  const auth = await requireRole(['admin', 'gestor', 'viewer'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('property_rooms')
    .select('id, name, bed_type, bed_count, provides_linen, sort_order')
    .eq('property_id', id)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  > }
) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const body = await req.json()

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error: delError } = await supabase
    .from('property_rooms')
    .delete()
    .eq('property_id', id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (body.length > 0) {
    const rows = body.map((r, i) => ({
      property_id: id,
      name: r.name?.trim() || null,
      bed_type: r.bed_type,
      bed_count: Number(r.bed_count) || 1,
      provides_linen: Boolean(r.provides_linen),
      sort_order: i,
    }))

    const { error: insError } = await supabase.from('property_rooms').insert(rows)
    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
