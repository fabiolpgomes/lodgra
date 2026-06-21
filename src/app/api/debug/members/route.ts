import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!

    const adminClient = createAdminClient()

    // Buscar todos os guests (cleaners)
    const { data: guests, error } = await adminClient
      .from('user_profiles')
      .select('id, full_name, role, guest_type')
      .eq('role', 'guest')
      .eq('guest_type', 'cleaner')
      .eq('organization_id', auth.organizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      organization_id: auth.organizationId,
      members: guests || [],
      count: guests?.length || 0,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
