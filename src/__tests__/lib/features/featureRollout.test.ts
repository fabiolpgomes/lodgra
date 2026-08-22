import { evaluateFeatureRollout } from '@/lib/features/featureRollout'

describe('feature rollout for IA Native', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('defaults to all-enabled when no rollout mode is configured', () => {
    delete process.env.IA_NATIVE_ROLLOUT_MODE
    delete process.env.IA_NATIVE_ROLLOUT_PERCENT
    delete process.env.IA_NATIVE_ROLLOUT_ALLOWLIST

    const rollout = evaluateFeatureRollout('property_intelligence', 'org-premium-1')

    expect(rollout.enabled).toBe(true)
    expect(rollout.mode).toBe('all')
    expect(rollout.reason).toBe('all_enabled')
  })

  it('allows explicit allowlist overrides during cohort rollout', () => {
    process.env.IA_NATIVE_ROLLOUT_MODE = 'cohort'
    process.env.IA_NATIVE_ROLLOUT_PERCENT = '0'
    process.env.IA_NATIVE_ROLLOUT_ALLOWLIST = 'org-beta-1, org-beta-2'

    const rollout = evaluateFeatureRollout('property_intelligence', 'org-beta-2')

    expect(rollout.enabled).toBe(true)
    expect(rollout.mode).toBe('allowlist')
    expect(rollout.reason).toBe('allowlisted')
    expect(rollout.allowlist).toContain('org-beta-2')
  })

  it('blocks organizations outside the configured cohort', () => {
    process.env.IA_NATIVE_ROLLOUT_MODE = 'cohort'
    process.env.IA_NATIVE_ROLLOUT_PERCENT = '0'
    delete process.env.IA_NATIVE_ROLLOUT_ALLOWLIST

    const rollout = evaluateFeatureRollout('property_intelligence', 'org-outside-cohort')

    expect(rollout.enabled).toBe(false)
    expect(rollout.mode).toBe('cohort')
    expect(rollout.reason).toBe('outside_cohort')
    expect(rollout.cohortBucket).not.toBeNull()
  })

  it('keeps non-cohort features fully enabled', () => {
    process.env.IA_NATIVE_ROLLOUT_MODE = 'off'
    process.env.IA_NATIVE_ROLLOUT_PERCENT = '0'

    const rollout = evaluateFeatureRollout('api_access', 'org-any')

    expect(rollout.enabled).toBe(true)
    expect(rollout.mode).toBe('all')
    expect(rollout.reason).toBe('all_enabled')
  })
})
