import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasFeature, FeatureName, FEATURE_MATRIX } from '@/lib/features/hasFeature'

const validFeatures = Object.keys(FEATURE_MATRIX)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get('feature') as FeatureName
    const orgId = searchParams.get('org_id')

    if (!feature) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing feature', validFeatures },
        { status: 400 }
      )
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Missing org_id parameter' },
        { status: 400 }
      )
    }

    if (!validFeatures.includes(feature)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing feature', validFeatures },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get organization subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_plan')
      .eq('id', orgId)
      .single()

    const plan = (org as any)?.subscription_plan || (org as any)?.plan || 'essencial'

    // Check if feature is accessible
    const hasAccess = await hasFeature(orgId, feature)

    return NextResponse.json({
      success: true,
      hasAccess,
      feature,
      plan,
      organizationId: orgId,
      message: hasAccess ? undefined : 'Feature not available for this plan',
    })
  } catch (error) {
    console.error('[GET /api/features/check] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
