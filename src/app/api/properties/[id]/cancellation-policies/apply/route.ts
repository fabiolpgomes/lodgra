import { createAdminClient } from '@/lib/supabase/admin'
import { requirePropertyAccess } from '@/lib/auth/requirePropertyAccess'
import { NextRequest, NextResponse } from 'next/server'

interface ApplyPolicyBody {
  policyId: string
  startDate: string
  endDate: string
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const access = await requirePropertyAccess(propertyId, ['admin', 'gestor', 'owner'])
    if (!access.authorized) return access.response
    const admin = createAdminClient()

    const body = await request.json() as Partial<ApplyPolicyBody>
    if (!body.policyId || !isDate(body.startDate) || !isDate(body.endDate) || body.startDate > body.endDate) {
      return NextResponse.json(
        { success: false, error: 'policyId, startDate and endDate are required; startDate must be before endDate' },
        { status: 400 }
      )
    }

    const { data: policy } = await admin
      .from('property_cancellation_policies')
      .select('id')
      .eq('id', body.policyId)
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .single()
    if (!policy) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    // Replace overlapping overrides so one calendar date cannot resolve to
    // multiple cancellation policies.
    const { error: deleteError } = await admin
      .from('property_cancellation_policy_periods')
      .delete()
      .eq('property_id', propertyId)
      .lte('start_date', body.endDate)
      .gte('end_date', body.startDate)
    if (deleteError) throw deleteError

    const { data: assignment, error: insertError } = await admin
      .from('property_cancellation_policy_periods')
      .insert({
        property_id: propertyId,
        policy_id: body.policyId,
        start_date: body.startDate,
        end_date: body.endDate,
      })
      .select()
      .single()
    if (insertError) throw insertError

    return NextResponse.json({ success: true, data: assignment }, { status: 201 })
  } catch (error) {
    console.error('[Cancellation policy apply] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to apply cancellation policy' }, { status: 500 })
  }
}
