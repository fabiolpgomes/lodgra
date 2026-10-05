import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { columnsToFees, feesToColumns, type PropertyFees } from '@/lib/properties/fees'

// Taxas cobradas no checkout (limpeza e animais). Fonte única: colunas em properties.
const FEE_COLUMNS = 'id, currency, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type'

async function authorizeProperty(propertyId: string) {
  const auth = await requireRole(['admin', 'gestor', 'manager', 'owner'])
  if (!auth.authorized) return { response: auth.response }
  if (!auth.organizationId) {
    return { response: NextResponse.json({ error: 'Organization not found' }, { status: 400 }) }
  }

  const admin = await createAdminClient()
  const { data: property, error } = await admin
    .from('properties')
    .select(FEE_COLUMNS)
    .eq('id', propertyId)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()

  if (error) throw error
  if (!property) {
    return { response: NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 }) }
  }
  return { admin, property, organizationId: auth.organizationId }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await authorizeProperty(id)
    if (!access.property) return access.response
    return NextResponse.json({
      success: true,
      data: { ...columnsToFees(access.property), currency: access.property.currency ?? null },
    })
  } catch (error) {
    console.error('[GET /api/properties/[id]/fees]', error)
    return NextResponse.json({ success: false, error: 'Failed to load fees' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await authorizeProperty(id)
    if (!access.property) return access.response

    const body = (await request.json().catch(() => null)) as Partial<PropertyFees> | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Pedido inválido' }, { status: 400 })
    }

    let columns
    try {
      columns = feesToColumns(body)
    } catch (e) {
      return NextResponse.json({ success: false, error: (e as Error).message }, { status: 422 })
    }

    const { data, error } = await access.admin
      .from('properties')
      .update(columns)
      .eq('id', id)
      .eq('organization_id', access.organizationId)
      .select(FEE_COLUMNS)
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data: { ...columnsToFees(data), currency: data.currency ?? null } })
  } catch (error) {
    console.error('[PUT /api/properties/[id]/fees]', error)
    return NextResponse.json({ success: false, error: 'Failed to save fees' }, { status: 500 })
  }
}
