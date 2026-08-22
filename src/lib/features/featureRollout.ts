import { createHash } from 'crypto'
import type { FeatureName } from './hasFeature'

export type FeatureRolloutMode = 'all' | 'allowlist' | 'cohort' | 'off'

export interface FeatureRolloutState {
  enabled: boolean
  mode: FeatureRolloutMode
  cohortPercent: number
  cohortBucket: number | null
  allowlist: string[]
  reason: string
}

type FeatureRolloutConfig = {
  mode: FeatureRolloutMode
  cohortPercent: number
  allowlist: string[]
}

function parseMode(value: string | undefined): FeatureRolloutMode {
  const normalized = value?.trim().toLowerCase()

  if (normalized === 'allowlist' || normalized === 'cohort' || normalized === 'off' || normalized === 'all') {
    return normalized
  }

  return 'all'
}

function parsePercent(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '100', 10)

  if (Number.isNaN(parsed)) return 100
  return Math.min(100, Math.max(0, parsed))
}

function parseAllowlist(value: string | undefined): string[] {
  if (!value) return []

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getCohortBucket(orgId: string): number {
  const normalized = orgId.trim().toLowerCase()
  const hash = createHash('sha256').update(normalized).digest()
  return hash.readUInt32BE(0) % 100
}

function getFeatureRolloutConfig(feature: FeatureName): FeatureRolloutConfig {
  if (feature !== 'property_intelligence') {
    return {
      mode: 'all',
      cohortPercent: 100,
      allowlist: [],
    }
  }

  return {
    mode: parseMode(process.env.IA_NATIVE_ROLLOUT_MODE),
    cohortPercent: parsePercent(process.env.IA_NATIVE_ROLLOUT_PERCENT),
    allowlist: parseAllowlist(process.env.IA_NATIVE_ROLLOUT_ALLOWLIST),
  }
}

export function evaluateFeatureRollout(feature: FeatureName, orgId: string): FeatureRolloutState {
  const config = getFeatureRolloutConfig(feature)
  const normalizedOrgId = orgId.trim()

  if (!normalizedOrgId) {
    return {
      enabled: false,
      mode: config.mode,
      cohortPercent: config.cohortPercent,
      cohortBucket: null,
      allowlist: config.allowlist,
      reason: 'missing_org_id',
    }
  }

  if (config.allowlist.includes(normalizedOrgId)) {
    return {
      enabled: true,
      mode: 'allowlist',
      cohortPercent: config.cohortPercent,
      cohortBucket: getCohortBucket(normalizedOrgId),
      allowlist: config.allowlist,
      reason: 'allowlisted',
    }
  }

  if (config.mode === 'off') {
    return {
      enabled: false,
      mode: 'off',
      cohortPercent: config.cohortPercent,
      cohortBucket: getCohortBucket(normalizedOrgId),
      allowlist: config.allowlist,
      reason: 'rollout_disabled',
    }
  }

  if (config.mode === 'all' || feature !== 'property_intelligence') {
    return {
      enabled: true,
      mode: config.mode,
      cohortPercent: config.cohortPercent,
      cohortBucket: getCohortBucket(normalizedOrgId),
      allowlist: config.allowlist,
      reason: 'all_enabled',
    }
  }

  const cohortBucket = getCohortBucket(normalizedOrgId)
  const enabled = cohortBucket < config.cohortPercent

  return {
    enabled,
    mode: 'cohort',
    cohortPercent: config.cohortPercent,
    cohortBucket,
    allowlist: config.allowlist,
    reason: enabled ? 'within_cohort' : 'outside_cohort',
  }
}
