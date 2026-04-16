import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/organization/members/assign-properties
 * Assign multiple properties to a user (admin only)
 *
 * Body: { user_id: string, property_ids: string[] }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const { user_id, property_ids } = body

  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 })
  }

  if (!Array.isArray(property_ids) || property_ids.length === 0) {
    return NextResponse.json({ error: 'property_ids deve ser um array não vazio' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Verify the user belongs to this organization
  const { data: userProfile } = await adminClient
    .from('user_profiles')
    .select('id')
    .eq('user_id', user_id)
    .eq('organization_id', auth.organizationId)
    .single()

  if (!userProfile) {
    return NextResponse.json(
      { error: 'Utilizador não encontrado nesta organização' },
      { status: 404 }
    )
  }

  // Verify all properties belong to this organization
  const { data: properties } = await adminClient
    .from('properties')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .in('id', property_ids)

  if (!properties || properties.length !== property_ids.length) {
    return NextResponse.json(
      { error: 'Uma ou mais propriedades não encontradas nesta organização' },
      { status: 404 }
    )
  }

  // Delete existing assignments and create new ones
  await adminClient
    .from('user_properties')
    .delete()
    .eq('user_id', user_id)

  const assignmentsToInsert = property_ids.map(property_id => ({
    user_id,
    property_id,
  }))

  const { error: insertError } = await adminClient
    .from('user_properties')
    .insert(assignmentsToInsert)

  if (insertError) {
    return NextResponse.json(
      { error: `Erro ao atribuir propriedades: ${insertError.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: `${property_ids.length} propriedade(s) atribuída(s) ao utilizador`,
  })
}

/**
 * GET /api/organization/members
 * List all members in the organization (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const adminClient = createAdminClient()

  // Get all members with their property assignments
  const { data: members, error } = await adminClient
    .from('user_profiles')
    .select(`
      id,
      user_id,
      role,
      created_at,
      user_properties(property_id)
    `)
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    members: members || [],
  })
}
