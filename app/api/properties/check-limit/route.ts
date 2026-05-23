import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PLAN_LIMITS } from '@/lib/billing/plans'

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Extract organization ID from query params
    const url = new URL(request.url)
    const orgId = url.searchParams.get('org_id')

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing org_id parameter' },
        { status: 400 }
      )
    }

    // Count current non-deleted properties for this org
    const { count, error: countError } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    if (countError) {
      console.error('Error counting properties:', countError)
      return NextResponse.json(
        { error: 'Failed to fetch property count' },
        { status: 500 }
      )
    }

    // Get the latest subscription plan for this org
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If no subscription found, default to essencial
    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription plan' },
        { status: 500 }
      )
    }

    const plan = (subscription?.plan as keyof typeof PLAN_LIMITS) || 'essencial'
    const planLimits = PLAN_LIMITS[plan]

    const currentCount = count || 0
    const maxAllowed = planLimits?.maxAllowed
    const canCreate = maxAllowed === null || currentCount < maxAllowed

    return NextResponse.json({
      success: true,
      canCreate,
      currentCount,
      limit: maxAllowed,
      plan,
      message: !canCreate
        ? `Property limit reached for ${plan} plan (${currentCount}/${maxAllowed}). Upgrade or remove a property.`
        : undefined,
    })
  } catch (error) {
    console.error('check-limit error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
