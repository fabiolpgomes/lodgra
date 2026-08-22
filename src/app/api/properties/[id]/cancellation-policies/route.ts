/**
 * Story 37.4: Cancellation Policies API
 * GET: Fetch all policies for property
 * POST: Create or seed default policies
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { requirePropertyAccess } from '@/lib/auth/requirePropertyAccess'
import { PropertyCancellationPolicy, CreateCancellationPolicyPayload, DEFAULT_POLICIES } from '@/types/cancellation.types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: propertyId } = await params

  try {
    const access = await requirePropertyAccess(propertyId, ['admin', 'gestor', 'owner', 'viewer'])
    if (!access.authorized) return access.response

    const admin = createAdminClient()

    // Fetch policies
    const { data: policies, error } = await admin
      .from('property_cancellation_policies')
      .select('*')
      .eq('property_id', propertyId)
      .order('policy_type', { ascending: true })
      .order('is_long_stay', { ascending: true })

    // Handle missing table gracefully
    if (error) {
      console.warn('[Cancellation-Policies] Error:', {
        code: error.code,
        message: error.message,
        details: (error as any).details,
      });

      // Check if table doesn't exist (multiple ways it can be reported)
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('property_cancellation_policies') ||
        (error as any).details?.includes('relation')
      ) {
        console.warn('Cancellation policies table does not exist - returning empty array');
        return NextResponse.json({ success: true, data: [] });
      }

      throw error;
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
    const access = await requirePropertyAccess(propertyId, ['admin', 'gestor', 'owner'])
    if (!access.authorized) return access.response
    const admin = createAdminClient()

    // If "seed" action, create default policies
    if (body.action === 'seed') {
      // The authenticated client can read the property but may not insert
      // defaults in environments where the legacy ALL policy has no INSERT
      // WITH CHECK clause. Ownership was already verified above, so use the
      // service client only for this server-side seed operation.
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

    // Otherwise, create single policy
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
      // Handle missing table gracefully
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Cancellation policies table does not exist - feature disabled');
        return NextResponse.json(
          { success: false, error: 'Cancellation policies feature is not available' },
          { status: 501 }
        );
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
