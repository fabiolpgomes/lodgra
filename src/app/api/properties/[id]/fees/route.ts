import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

type FeeInput = { name: string; amount: number }

async function authorizeProperty(propertyId: string) {
  const auth = await requireRole(['admin', 'gestor', 'manager', 'owner'])
  if (!auth.authorized) return { auth, property: null }

  if (!auth.organizationId) {
    return { auth, property: null, response: NextResponse.json({ error: 'Organization not found' }, { status: 400 }) }
  }

  const admin = await createAdminClient()
  const { data: property, error } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .eq('organization_id', auth.organizationId)
    .maybeSingle()

  if (error) throw error
  if (!property) {
    return { auth, property: null, response: NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 }) }
  }

  return { auth, property, admin }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await authorizeProperty(id)
    if (access.response) return access.response
    if (!access.property || !access.admin) return access.auth.response

    const { data, error } = await access.admin
      .from('property_fees')
      .select('id, name, amount, created_at, updated_at')
      .eq('property_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    console.error('[GET /api/properties/[id]/fees]', error)
    return NextResponse.json({ success: false, error: 'Failed to load fees' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const access = await authorizeProperty(id)
    if (access.response) return access.response
    if (!access.property || !access.admin) return access.auth.response

    const body = await request.json() as { fees?: FeeInput[] }
    if (!Array.isArray(body.fees)) {
      return NextResponse.json({ success: false, error: 'fees must be an array' }, { status: 400 })
    }

    const fees = body.fees.map((fee) => ({
      name: typeof fee.name === 'string' ? fee.name.trim() : '',
      amount: typeof fee.amount === 'number' ? fee.amount : Number(fee.amount),
    }))

    if (fees.some((fee) => !fee.name || !Number.isFinite(fee.amount) || fee.amount <= 0)) {
      return NextResponse.json({ success: false, error: 'Each fee needs a name and an amount greater than zero' }, { status: 422 })
    }

    const { error: deleteError } = await access.admin.from('property_fees').delete().eq('property_id', id)
    if (deleteError) throw deleteError

    if (fees.length > 0) {
      const { error: insertError } = await access.admin
        .from('property_fees')
        .insert(fees.map((fee) => ({ property_id: id, ...fee })))
      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, data: fees }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/properties/[id]/fees]', error)
    return NextResponse.json({ success: false, error: 'Failed to save fees' }, { status: 500 })
  }
}
