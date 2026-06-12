import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// DELETE /api/calendar/blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user role (must be admin or gestor)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 }
      )
    }

    if (!['admin', 'gestor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admins and gestors can delete blocks' },
        { status: 403 }
      )
    }

    // Verify block exists and belongs to user's organization
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (blockError || !block) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    if (block.organization_id !== profile.organization_id) {
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
