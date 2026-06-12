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
    if (!auth.authorized) {
      console.error('[Blocks API] Unauthorized:', { organizationId: auth.organizationId })
      return auth.response!
    }

    const { id } = await params
    const supabase = await createClient()

    // Verify block exists and belongs to user's organization
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (blockError || !block) {
      console.error('[Blocks API] Block not found:', { id, blockError })
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (block.organization_id !== auth.organizationId) {
      console.error('[Blocks API] Organization mismatch:', {
        blockOrg: block.organization_id,
        userOrg: auth.organizationId,
      })
      return NextResponse.json(
        { error: 'Block does not belong to your organization' },
        { status: 403 }
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
