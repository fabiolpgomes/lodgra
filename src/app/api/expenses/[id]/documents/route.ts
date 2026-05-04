import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const MAX_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_FILES = 5

async function verifyExpenseAccess(supabase: Awaited<ReturnType<typeof createClient>>, expenseId: string) {
  const allowedPropertyIds = await getUserPropertyIds(supabase)
  const query = supabase
    .from('expenses')
    .select('id, property_id')
    .eq('id', expenseId)
    .single()
  const { data: expense, error } = await query
  if (error || !expense) return null
  if (allowedPropertyIds !== null && !allowedPropertyIds.includes(expense.property_id)) return null
  return expense
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { id: expenseId } = await params
    const supabase = await createClient()

    if (!(await verifyExpenseAccess(supabase, expenseId))) {
      return NextResponse.json({ error: 'Despesa não encontrada ou acesso negado' }, { status: 404 })
    }

    const { data: documents, error } = await supabase
      .from('expense_documents')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ documents })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id: expenseId } = await params
    const supabase = await createClient()

    if (!(await verifyExpenseAccess(supabase, expenseId))) {
      return NextResponse.json({ error: 'Despesa não encontrada ou acesso negado' }, { status: 404 })
    }

    // Check current document count
    const { count } = await supabase
      .from('expense_documents')
      .select('id', { count: 'exact', head: true })
      .eq('expense_id', expenseId)

    if ((count ?? 0) >= MAX_FILES) {
      return NextResponse.json({ error: `Máximo de ${MAX_FILES} ficheiros por despesa` }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Nenhum ficheiro enviado' }, { status: 400 })

    // Server-side MIME validation (AC7)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de ficheiro não permitido' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ficheiro excede 20MB' }, { status: 400 })
    }

    const fileId = crypto.randomUUID()
    const storagePath = `${expenseId}/${fileId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const adminClient = createAdminClient()

    const { error: uploadError } = await adminClient.storage
      .from('expense-documents')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: `Erro no Storage: ${uploadError.message}` }, { status: 500 })
    }

    const { data: doc, error: insertError } = await supabase
      .from('expense_documents')
      .insert({
        expense_id: expenseId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()

    if (insertError) {
      await adminClient.storage.from('expense-documents').remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 })
  }
}
