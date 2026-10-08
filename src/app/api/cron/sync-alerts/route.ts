import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { runSyncAlertsForOrganization, type SyncAlertOutcome } from '@/lib/sync-health/alerts-run'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Every 15 min (pg_cron): e-mails tenant admins about sync problems — once, then a daily reminder. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const [listings, connections] = await Promise.all([
    db.from('property_listings').select('organization_id').eq('is_active', true).eq('sync_enabled', true),
    db.from('email_connections').select('organization_id'),
  ])
  if (listings.error || connections.error) {
    return NextResponse.json({ error: 'Could not list tenants' }, { status: 503 })
  }

  const organizationIds = [...new Set(
    [...(listings.data ?? []), ...(connections.data ?? [])]
      .map(row => row.organization_id as string | null)
      .filter((id): id is string => Boolean(id)),
  )]

  const results: Record<string, SyncAlertOutcome> = {}
  for (const organizationId of organizationIds) {
    try {
      results[organizationId] = await runSyncAlertsForOrganization(db, organizationId)
    } catch {
      results[organizationId] = 'failed'
    }
  }

  const failed = Object.values(results).filter(outcome => outcome === 'failed').length
  return NextResponse.json({ tenants: organizationIds.length, results }, { status: failed ? 207 : 200 })
}
