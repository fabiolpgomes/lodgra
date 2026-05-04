import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

async function verifyExpenseAccess(supabase: Awaited<ReturnType<typeof createClient>>, expenseId: string) {
  const allowedPropertyIds = await getUserPropertyIds(supabase)
  const { data: expense, error } = await supabase
    .from('expenses')
    .select('id, property_id')
    .eq('id', expenseId)
    .single()
  if (error || !expense) return false
  if (allowedPropertyIds !== null && !allowedPropertyIds.includes(expense.property_id)) return false
  return true
}

// GET — returns a signed download URL (60 min)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { id: expenseId, docId } = await params
    const supabase = await createClient()

    if (!(await verifyExpenseAccess(supabase, expenseId))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: doc, error: fetchError } = await supabase
      .from('expense_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('expense_id', expenseId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    const adminClient = createAdminClient()
    const { data: signed, error: signError } = await adminClient.storage
      .from('expense-documents')
      .createSignedUrl(doc.file_path, 3600)

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Erro ao gerar link de download' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

// DELETE — remove document record + storage file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: expenseId, docId } = await params
    const supabase = await createClient()

    if (!(await verifyExpenseAccess(supabase, expenseId))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: doc, error: fetchError } = await supabase
      .from('expense_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('expense_id', expenseId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
    }

    // Delete storage file first
    const adminClient = createAdminClient()
    await adminClient.storage.from('expense-documents').remove([doc.file_path])

    // Delete DB record (ON DELETE CASCADE handles orphan cleanup if storage fails)
    const { error: deleteError } = await supabase
      .from('expense_documents')
      .delete()
      .eq('id', docId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
