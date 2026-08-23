import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasFeature, FeatureName, FEATURE_MATRIX } from '@/lib/features/hasFeature'
import { evaluateFeatureRollout } from '@/lib/features/featureRollout'

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

    const plan = (org as unknown as Record<string, unknown>)?.subscription_plan || (org as unknown as Record<string, unknown>)?.plan || 'essencial'

    // Check if feature is accessible
    const planAccess = await hasFeature(orgId, feature)
    const rollout = evaluateFeatureRollout(feature, orgId)
    const hasAccess = planAccess && rollout.enabled

    return NextResponse.json({
      success: true,
      hasAccess,
      planAccess,
      feature,
      plan,
      organizationId: orgId,
      rollout,
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
