/**
 * Story 37.4: Cancellation Policies API
 * GET: Fetch all policies for property
 * POST: Create or seed default policies
 */

import { createClient } from '@/lib/supabase/server'
import { PropertyCancellationPolicy, CreateCancellationPolicyPayload, DEFAULT_POLICIES } from '@/types/cancellation.types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership via owners table JOIN
    const { data: property } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    const owners = Array.isArray(property?.owners) ? property?.owners[0] : property?.owners
    if (!property || owners?.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch policies
    const { data: policies, error } = await supabase
      .from('property_cancellation_policies')
      .select('*')
      .eq('property_id', propertyId)
      .order('policy_type, is_long_stay')

    if (error) throw error

    return NextResponse.json({ success: true, data: policies || [] })
  } catch (error) {
    console.error('Error fetching cancellation policies:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()
    const body = await request.json()
    const userId = await getAuthUserId(request)

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership via owners table JOIN
    const { data: property } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    const owners = Array.isArray(property?.owners) ? property?.owners[0] : property?.owners
    if (!property || owners?.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // If "seed" action, create default policies
    if (body.action === 'seed') {
      const policies: PropertyCancellationPolicy[] = []

      for (const policyType of ['flexible', 'moderate', 'limited', 'firm', 'rigid'] as const) {
        for (const duration of ['short', 'long'] as const) {
          const template = DEFAULT_POLICIES[policyType][duration]
          if (!template) continue

          const { data: policy, error } = await supabase
            .from('property_cancellation_policies')
            .insert({
              property_id: propertyId,
              ...template,
            })
            .select()
            .single()

          if (error && !error.message.includes('duplicate')) throw error
          if (policy) policies.push(policy)
        }
      }

      return NextResponse.json({ success: true, data: policies })
    }

    // Otherwise, create single policy
    const payload: CreateCancellationPolicyPayload = body

    const { data: policy, error } = await supabase
      .from('property_cancellation_policies')
      .insert({
        property_id: propertyId,
        policy_type: payload.policy_type,
        is_long_stay: payload.is_long_stay,
        full_refund_days: payload.full_refund_days,
        partial_refund_days: payload.partial_refund_days || null,
        partial_refund_percent: payload.partial_refund_percent || null,
        non_refundable_discount_percent: payload.non_refundable_discount_percent || 0,
      })
      .select()
      .single()

    if (error) {
      if (error.message.includes('duplicate')) {
        return NextResponse.json(
          { success: false, error: 'Policy already exists for this type and duration' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, data: policy }, { status: 201 })
  } catch (error) {
    console.error('Error creating cancellation policy:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create policy' },
      { status: 500 }
    )
  }
}

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}
