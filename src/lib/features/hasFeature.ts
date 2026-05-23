import { createClient } from '@supabase/supabase-js'
import { PLAN_LIMITS } from '@/lib/billing/plans'

export type FeatureName =
  | 'cleaner_portal'
  | 'advanced_reports'
  | 'api_access'
  | 'forecast_bi'

export const FEATURE_MATRIX: Record<FeatureName, (keyof typeof PLAN_LIMITS)[]> = {
  cleaner_portal:   ['expansao', 'premium', 'growth', 'professional', 'business', 'pro'],
  advanced_reports: ['expansao', 'premium', 'growth', 'professional', 'business', 'pro'],
  api_access:       ['premium', 'professional', 'business', 'pro', 'enterprise'],
  forecast_bi:      ['premium', 'professional', 'business', 'pro', 'enterprise'],
}

/**
 * Check if an organization has access to a specific feature based on their subscription plan
 * @param orgId Organization ID
 * @param featureName Feature to check access for
 * @returns true if org has access to feature, false otherwise
 */
export async function hasFeature(
  orgId: string,
  featureName: FeatureName
): Promise<boolean> {
  try {
    const plan = await getSubscriptionPlan(orgId)
    const allowedPlans = FEATURE_MATRIX[featureName] ?? []
    return allowedPlans.includes(plan as keyof typeof PLAN_LIMITS)
  } catch (error) {
    console.error(`Error checking feature ${featureName} for org ${orgId}:`, error)
    // Default to false (deny access) on error for security
    return false
  }
}

/**
 * Get the subscription plan for an organization
 * Defaults to 'essencial' if no subscription found
 * @param orgId Organization ID
 * @returns Plan name (essencial, expansao, premium, etc)
 */
async function getSubscriptionPlan(orgId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is expected for new orgs
    console.error('Error fetching subscription plan:', error)
    return 'essencial'
  }

  return data?.plan ?? 'essencial'
}

/**
 * Get all accessible features for an organization
 * Useful for conditional UI rendering
 * @param orgId Organization ID
 * @returns Array of feature names the org has access to
 */
export async function getAccessibleFeatures(orgId: string): Promise<FeatureName[]> {
  const features: FeatureName[] = [
    'cleaner_portal',
    'advanced_reports',
    'api_access',
    'forecast_bi',
  ]

  const accessible: FeatureName[] = []

  for (const feature of features) {
    const hasAccess = await hasFeature(orgId, feature)
    if (hasAccess) {
      accessible.push(feature)
    }
  }

  return accessible
}
