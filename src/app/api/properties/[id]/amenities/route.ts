import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'gestor', 'viewer'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('property_amenities')
    .select('amenity_id')
    .eq('property_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map(r => r.amenity_id))
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const body = await req.json()

  if (!Array.isArray(body) || body.some(v => typeof v !== 'string')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const amenityIds: string[] = body

  const supabase = await createClient()

  // Replace all — delete existing then insert new
  const { error: delError } = await supabase
    .from('property_amenities')
    .delete()
    .eq('property_id', id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (amenityIds.length > 0) {
    const { error: insError } = await supabase
      .from('property_amenities')
      .insert(amenityIds.map(amenity_id => ({ property_id: id, amenity_id })))

    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
