/**
 * Story 37.4: Cancellation Policies API
 * GET: Fetch all policies for property
 * POST: Create or seed default policies
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  PropertyCancellationPolicy,
  CreateCancellationPolicyPayload,
  DEFAULT_POLICIES,
} from '@/types/cancellation.types'
import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params

  try {
    const access = await authorizePropertyManagement(propertyId, [
      'admin',
      'gestor',
      'manager',
      'owner',
      'viewer',
    ])
    if (!access.authorized) return access.response!
    const { admin } = access

    const { data: policies, error } = await admin
      .from('property_cancellation_policies')
      .select('*')
      .eq('property_id', propertyId)
      .order('policy_type', { ascending: true })
      .order('is_long_stay', { ascending: true })

    if (error) {
      console.warn('[Cancellation-Policies] Error:', {
        code: error.code,
        message: error.message,
        details: (error as any).details,
      })

      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('property_cancellation_policies') ||
        (error as any).details?.includes('relation')
      ) {
        console.warn('Cancellation policies table does not exist - returning empty array')
        return NextResponse.json({ success: true, data: [] })
      }

      throw error
    }

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
    const body = await request.json()
    const access = await authorizePropertyManagement(propertyId, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response!
    const { admin } = access

    if (body.action === 'seed') {
      const templates = (['flexible', 'moderate', 'limited', 'firm', 'rigid'] as const)
        .flatMap((policyType) => (['short', 'long'] as const).map((duration) => ({
          property_id: propertyId,
          ...DEFAULT_POLICIES[policyType][duration],
        })))

      const { data: policies, error } = await admin
        .from('property_cancellation_policies')
        .upsert(templates, { onConflict: 'property_id,policy_type,is_long_stay' })
        .select()
        .order('is_long_stay', { ascending: true })
        .order('policy_type', { ascending: true })

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist')) {
          return NextResponse.json(
            { success: false, error: 'Cancellation policies feature is not available' },
            { status: 501 }
          )
        }
        throw error
      }

      return NextResponse.json({ success: true, data: policies || [] })
    }

    const payload: CreateCancellationPolicyPayload = body

    const { data: policy, error } = await admin
      .from('property_cancellation_policies')
      .insert({
        property_id: propertyId,
        policy_type: payload.policy_type,
        is_long_stay: payload.is_long_stay,
        full_refund_days: payload.full_refund_days,
        partial_refund_days: payload.partial_refund_days ?? null,
        partial_refund_percent: payload.partial_refund_percent ?? null,
        non_refundable_discount_percent: payload.non_refundable_discount_percent ?? 0,
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
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Cancellation policies table does not exist - feature disabled')
        return NextResponse.json(
          { success: false, error: 'Cancellation policies feature is not available' },
          { status: 501 }
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
