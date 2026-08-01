/**
 * Story 37.4: Individual Cancellation Policy Endpoints
 * PUT: Update policy
 * DELETE: Remove policy
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { UpdateCancellationPolicyPayload } from '@/types/cancellation.types'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const { id: propertyId, policyId } = await params

  try {
    const supabase = await createAdminClient()
    const body: UpdateCancellationPolicyPayload = await request.json()

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.owner_id !== (await getAuthUserId(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Verify policy belongs to property
    const { data: policy } = await supabase
      .from('property_cancellation_policies')
      .select('*')
      .eq('id', policyId)
      .eq('property_id', propertyId)
      .single()

    if (!policy) {
      return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
    }

    // Update
    const updatePayload: any = { updated_at: new Date().toISOString() }
    if (body.policy_type !== undefined) updatePayload.policy_type = body.policy_type
    if (body.full_refund_days !== undefined) updatePayload.full_refund_days = body.full_refund_days
    if (body.partial_refund_days !== undefined) updatePayload.partial_refund_days = body.partial_refund_days
    if (body.partial_refund_percent !== undefined) updatePayload.partial_refund_percent = body.partial_refund_percent
    if (body.non_refundable_discount_percent !== undefined)
      updatePayload.non_refundable_discount_percent = body.non_refundable_discount_percent
    if (body.is_active !== undefined) updatePayload.is_active = body.is_active

    const { data: updated, error } = await supabase
      .from('property_cancellation_policies')
      .update(updatePayload)
      .eq('id', policyId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating cancellation policy:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update policy' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const { id: propertyId, policyId } = await params

  try {
    const supabase = await createAdminClient()

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('id', propertyId)
      .single()

    if (!property || property.owner_id !== (await getAuthUserId(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Verify policy belongs to property
    const { data: policy } = await supabase
      .from('property_cancellation_policies')
      .select('*')
      .eq('id', policyId)
      .eq('property_id', propertyId)
      .single()

    if (!policy) {
      return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
    }

    // Check if policy is used by active reservations
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('cancellation_policy_id', policyId)
      .eq('status', 'confirmed')
      .limit(1)

    if (reservations && reservations.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete policy with active reservations' },
        { status: 409 }
      )
    }

    // Delete
    const { error } = await supabase
      .from('property_cancellation_policies')
      .delete()
      .eq('id', policyId)

    if (error) throw error

    return NextResponse.json({ success: true, data: { id: policyId } })
  } catch (error) {
    console.error('Error deleting cancellation policy:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete policy' },
      { status: 500 }
    )
  }
}

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const supabase = await createAdminClient()
  const { data } = await supabase.auth.getUser(token)
  return data.user?.id || null
}
