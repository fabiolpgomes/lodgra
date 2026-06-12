import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

// DELETE /api/calendar/blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Blocks API] DELETE handler started')

    const auth = await requireRole(['admin', 'gestor'])
    console.log('[Blocks API] Auth check:', {
      authorized: auth.authorized,
      organizationId: auth.organizationId,
    })

    if (!auth.authorized) {
      console.error('[Blocks API] Unauthorized:', { organizationId: auth.organizationId })
      return auth.response!
    }

    const { id } = await params
    console.log('[Blocks API] DELETE received ID:', { id, type: typeof id, length: id?.length })

    const supabase = await createClient()

    // First, verify block exists with admin client (bypass RLS) to check if it exists
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminSupabase = createAdminClient()
    const { data: adminBlock, error: adminError } = await adminSupabase
      .from('calendar_blocks')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    console.log('[Blocks API] Admin check (bypass RLS):', {
      blockExists: !!adminBlock,
      blockOrgId: adminBlock?.organization_id,
      adminError: adminError?.message,
    })

    // Verify block exists and belongs to user's organization
    const { data: block, error: blockError } = await supabase
      .from('calendar_blocks')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    console.log('[Blocks API] RLS check result:', {
      blockExists: !!block,
      blockError: blockError?.message,
      blockError_code: blockError?.code,
      userOrgId: auth.organizationId,
    })

    if (blockError || !block) {
      console.error('[Blocks API] Block not found or RLS denied:', {
        id,
        blockExists_adminCheck: !!adminBlock,
        blockError: blockError?.message,
        blockError_code: blockError?.code,
        auth_organizationId: auth.organizationId,
        block_organizationId: adminBlock?.organization_id,
      })
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      )
    }

    console.log('[Blocks API] Block found:', { id: block.id, org: block.organization_id, userOrg: auth.organizationId })

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
