import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user can delete (admin/manager)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete items first
  await supabase.from('cleaning_checklist_items').delete().eq('checklist_id', id)

  // Delete checklist
  const { error } = await supabase
    .from('cleaning_checklists')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, notes, item_id, is_done } = body

  // Toggle individual item
  if (item_id !== undefined && is_done !== undefined) {
    const { error } = await supabase
      .from('cleaning_checklist_items')
      .update({ is_done, done_at: is_done ? new Date().toISOString() : null })
      .eq('id', item_id)
      .eq('checklist_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Check if all items done → auto-complete checklist
    const { data: items } = await supabase
      .from('cleaning_checklist_items')
      .select('is_done')
      .eq('checklist_id', id)

    const allDone = items?.every(i => i.is_done)
    if (allDone) {
      await supabase
        .from('cleaning_checklists')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)
    }

    return NextResponse.json({ ok: true })
  }

  // Update checklist status/notes
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) {
    updates.status = status
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    if (status === 'in_progress' && !updates.completed_at) updates.completed_at = null
  }
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await supabase
    .from('cleaning_checklists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
