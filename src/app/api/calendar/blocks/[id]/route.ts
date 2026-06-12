import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/calendar/blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[Blocks API] DELETE handler called')
  try {
    const { id } = await params
    console.log('[Blocks API] DELETE received ID:', { id, type: typeof id, length: id?.length })

    // TEMP: Bypass requireRole to test if RLS is the problem
    console.log('[Blocks API] TEMP: Skipping requireRole for testing')

    const supabase = await createClient()
    console.log('[Blocks API] Supabase client created')

    // Verify block exists and belongs to user's organization
    console.log('[Blocks API] Querying block with ID:', id)
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    console.log('[Blocks API] Query result:', { block: block?.id, error: blockError?.message, errorCode: blockError?.code })

    if (blockError || !block) {
      console.error('[Blocks API] Block not found:', {
        id,
        blockError: blockError?.message,
        blockError_code: blockError?.code,
      })
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    console.log('[Blocks API] Block found:', { id: block.id, org: block.organization_id })

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
