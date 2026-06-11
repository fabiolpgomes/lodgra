import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const { id } = await params
  const adminClient = createAdminClient()

  // Verify property belongs to user's organization
  const { data: property, error } = await adminClient
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('organization_id', auth.organizationId)
    .single()

  if (error || !property) {
    return NextResponse.json(
      { error: 'Property not found or access denied' },
      { status: 404 }
    )
  }

  return NextResponse.json(property)
}
