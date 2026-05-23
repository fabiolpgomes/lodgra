import { NextResponse } from 'next/server'
import { hasFeature, FeatureName, FEATURE_MATRIX } from '@/lib/features/hasFeature'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const feature = url.searchParams.get('feature') as FeatureName | null
    const orgId = url.searchParams.get('org_id') as string | null

    // Validate feature parameter
    if (!feature || !Object.keys(FEATURE_MATRIX).includes(feature)) {
      return NextResponse.json(
        {
          error: 'Invalid or missing feature parameter',
          validFeatures: Object.keys(FEATURE_MATRIX),
          success: false,
        },
        { status: 400 }
      )
    }

    // Get org_id from either query param or from authenticated session
    const organizationId = orgId

    if (!organizationId) {
      // Try to get from auth session (if using Supabase auth)
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Missing org_id parameter or authorization header', success: false },
          { status: 400 }
        )
      }

      // Extract org_id from JWT token (optional, depends on your auth setup)
      // For now, require explicit org_id parameter
      return NextResponse.json(
        { error: 'Missing org_id parameter', success: false },
        { status: 400 }
      )
    }

    // Check feature access
    const hasAccess = await hasFeature(organizationId, feature)

    // Get current plan for response
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const plan = subscription?.plan ?? 'essencial'

    return NextResponse.json({
      success: true,
      hasAccess,
      feature,
      plan,
      organizationId,
      message: !hasAccess
        ? `Feature '${feature}' is not available in your current plan (${plan}). Upgrade to access.`
        : undefined,
    })
  } catch (error) {
    console.error('Feature check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
