import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

// DELETE /api/calendar/blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const supabase = await createClient()

    // Verify block exists
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id')
      .eq('id', id)
      .single()

    if (blockError || !block) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    // Delete block
    const { data: blockData } = await supabase
      .from('calendar_blocks')
      .select('start_date, end_date, notes')
      .eq('id', id)
      .single()

    const { error: deleteError } = await supabase
      .from('calendar_blocks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Blocks API] DELETE error:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao eliminar bloqueio' },
        { status: 500 }
      )
    }

    // Log deletion for audit trail
    console.log(
      `[Audit] Bloqueio deletado: ID=${id}, ` +
      `Período=${blockData?.start_date} até ${blockData?.end_date}, ` +
      `Notas="${blockData?.notes || 'N/A'}"`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Blocks API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Erro inesperado ao eliminar bloqueio' },
      { status: 500 }
    )
  }
}
