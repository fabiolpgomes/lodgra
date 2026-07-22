import { createAdminClient } from '@/lib/supabase/admin'

/**
 * AC8: Feature flag management for email-iCal reconciliation
 * - Per-tenant feature flags
 * - Platform whitelist (Airbnb + Booking for pilot)
 * - Pilot tracking and metrics
 */

export interface FeatureFlagStatus {
  organization_id: string
  enabled: boolean
  pilot_started_at?: string
  pilot_platforms: string[]
  days_running?: number
}

/**
 * Check if email-iCal reconciliation is enabled for organization
 */
export async function isEmailICalEnabled(organizationId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('email_ical_reconciliation_enabled')
    .eq('id', organizationId)
    .single()

  if (error || !data) {
    return false
  }

  return data.email_ical_reconciliation_enabled === true
}

/**
 * Check if platform is enabled for pilot (Airbnb + Booking only)
 */
export async function isPlatformInPilot(
  organizationId: string,
  platform: string
): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('email_ical_pilot_platforms')
    .eq('id', organizationId)
    .single()

  if (error || !data) {
    return false
  }

  const platforms = data.email_ical_pilot_platforms || []
  return platforms.includes(platform.toLowerCase())
}

/**
 * Get feature flag status for organization
 */
export async function getFeatureFlagStatus(organizationId: string): Promise<FeatureFlagStatus> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('email_ical_reconciliation_enabled, email_ical_pilot_started_at, email_ical_pilot_platforms')
    .eq('id', organizationId)
    .single()

  if (error || !data) {
    return {
      organization_id: organizationId,
      enabled: false,
      pilot_platforms: [],
    }
  }

  const pilotStartedAt = data.email_ical_pilot_started_at
  let daysRunning: number | undefined

  if (pilotStartedAt) {
    const started = new Date(pilotStartedAt)
    const now = new Date()
    daysRunning = Math.floor((now.getTime() - started.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    organization_id: organizationId,
    enabled: data.email_ical_reconciliation_enabled === true,
    pilot_started_at: pilotStartedAt,
    pilot_platforms: data.email_ical_pilot_platforms || [],
    days_running: daysRunning,
  }
}

/**
 * Enable pilot for organization (Airbnb + Booking only)
 */
export async function enablePilot(organizationId: string, reason?: string): Promise<void> {
  const supabase = createAdminClient()

  // Update organization
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      email_ical_reconciliation_enabled: true,
      email_ical_pilot_started_at: new Date().toISOString(),
      email_ical_pilot_platforms: ['airbnb', 'booking'],
    })
    .eq('id', organizationId)

  if (updateError) {
    throw new Error(`Failed to enable pilot: ${updateError.message}`)
  }

  // Log to audit table
  const { error: auditError } = await supabase.from('feature_flag_audit').insert({
    organization_id: organizationId,
    feature: 'email_ical_reconciliation',
    enabled: true,
    reason: reason || 'Pilot enabled',
  })

  if (auditError) {
    console.warn('Failed to log feature flag change:', auditError)
  }
}

/**
 * Disable feature (for rollback if issues detected)
 */
export async function disablePilot(organizationId: string, reason?: string): Promise<void> {
  const supabase = createAdminClient()

  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      email_ical_reconciliation_enabled: false,
    })
    .eq('id', organizationId)

  if (updateError) {
    throw new Error(`Failed to disable pilot: ${updateError.message}`)
  }

  // Log to audit table
  const { error: auditError } = await supabase.from('feature_flag_audit').insert({
    organization_id: organizationId,
    feature: 'email_ical_reconciliation',
    enabled: false,
    reason: reason || 'Pilot disabled',
  })

  if (auditError) {
    console.warn('Failed to log feature flag change:', auditError)
  }
}
