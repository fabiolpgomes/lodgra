import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { writeAuditLog } from '@/lib/audit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const supabase = await createClient()

    // Verificar se o proprietário existe
    const { data: owner, error: fetchError } = await supabase
      .from('owners')
      .select('id, full_name')
      .eq('id', id)
      .single()

    if (fetchError || !owner) {
      return NextResponse.json(
        { error: 'Proprietário não encontrado' },
        { status: 404 }
      )
    }

    // Eliminar proprietário (properties.owner_id será SET NULL via FK)
    const { error: deleteError } = await supabase
      .from('owners')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Erro ao eliminar proprietário: ' + deleteError.message },
        { status: 500 }
      )
    }

    await writeAuditLog({
      userId: auth.userId!,
      action: 'delete',
      resourceType: 'owner',
      resourceId: id,
      details: { full_name: owner.full_name },
    })

    return NextResponse.json({ success: true })

  } catch (error: unknown) {
    console.error('Erro ao eliminar proprietário:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao eliminar proprietário' },
      { status: 500 }
    )
  }
}
