import { createClient } from '@/lib/supabase/server'
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { data: property } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()
    const owners = Array.isArray(property?.owners) ? property?.owners[0] : property?.owners
    if (!property || owners?.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json() as Partial<ApplyPolicyBody>
    if (!body.policyId || !isDate(body.startDate) || !isDate(body.endDate) || body.startDate > body.endDate) {
      return NextResponse.json(
        { success: false, error: 'policyId, startDate and endDate are required; startDate must be before endDate' },
        { status: 400 }
      )
    }

    const { data: policy } = await supabase
      .from('property_cancellation_policies')
      .select('id')
      .eq('id', body.policyId)
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .single()
    if (!policy) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    // Replace overlapping overrides so one calendar date cannot resolve to
    // multiple cancellation policies.
    const { error: deleteError } = await supabase
      .from('property_cancellation_policy_periods')
      .delete()
      .eq('property_id', propertyId)
      .lte('start_date', body.endDate)
      .gte('end_date', body.startDate)
    if (deleteError) throw deleteError

    const { data: assignment, error: insertError } = await supabase
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
