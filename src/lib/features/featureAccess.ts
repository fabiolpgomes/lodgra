import { hasFeature, type FeatureName } from './hasFeature'
import { evaluateFeatureRollout } from './featureRollout'

export async function isFeatureAccessible(orgId: string, feature: FeatureName) {
  const planAccess = await hasFeature(orgId, feature)
  const rollout = evaluateFeatureRollout(feature, orgId)

  return {
    hasAccess: planAccess && rollout.enabled,
    planAccess,
    rollout,
  }
}
