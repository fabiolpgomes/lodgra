import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const orgId = (await params).orgId
  if (!orgId) return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })

  if (auth.organizationId !== orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  try {
    const { data: branding, error } = await adminClient.from('organization_branding').select('*').eq('organization_id', orgId).single()

    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: 'Database error' }, { status: 500 })

    if (!branding) {
      return NextResponse.json({
        id: null,
        organization_id: orgId,
        logo_url: null,
        favicon_url: null,
        primary_color: '#1E40AF',
        secondary_color: '#6B7280',
        accent_color: '#FFC000',
        created_at: null,
        updated_at: null,
      }, { status: 200 })
    }

    return NextResponse.json(branding, { status: 200 })
  } catch (error) {
    console.error('Error fetching branding:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
