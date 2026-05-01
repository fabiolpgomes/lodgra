import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/compliance — Aggregated compliance stats for admin dashboard
 * Story 11.5: Consent Management Dashboard
 */
export async function GET() {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const organizationId = auth.organizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'Admin has no organization' }, { status: 403 })
  }

  try {
    const adminClient = createAdminClient()

    // Fetch all data in parallel — scoped to admin's organization (AC8)
    const [
      consentRecordsResult,
      deletionRequestsResult,
      recentExportsResult,
    ] = await Promise.all([
      // Consent records — org-scoped
      adminClient
        .from('consent_records')
        .select('consent_type, consent_value, user_id, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500),

      // Deletion requests — org-scoped
      adminClient
        .from('deletion_requests')
        .select('id, user_id, requested_at, scheduled_at, status, cancelled_at, completed_at')
        .eq('organization_id', organizationId)
        .order('requested_at', { ascending: false }),

      // Data exports in last 30 days — org-scoped via audit_logs join
      adminClient
        .from('audit_logs')
        .select('id, user_id, created_at')
        .eq('action', 'data_export_requested')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
    ])

    const consentRecords = consentRecordsResult.data || []
    const deletionRequests = deletionRequestsResult.data || []
    const recentExports = recentExportsResult.data || []

    // Aggregate consent stats
    const consentStats: Record<string, { accepted: number; declined: number }> = {}
    // Deduplicate: latest per user+type
    const seen = new Set<string>()
    for (const record of consentRecords) {
      const key = `${record.user_id || 'anon'}-${record.consent_type}`
      if (seen.has(key)) continue
      seen.add(key)

      if (!consentStats[record.consent_type]) {
        consentStats[record.consent_type] = { accepted: 0, declined: 0 }
      }
      if (record.consent_value) {
        consentStats[record.consent_type].accepted++
      } else {
        consentStats[record.consent_type].declined++
      }
    }

    // Aggregate deletion stats
    const deletionStats = {
      pending: deletionRequests.filter(r => r.status === 'pending').length,
      completed: deletionRequests.filter(r => r.status === 'completed').length,
      cancelled: deletionRequests.filter(r => r.status === 'cancelled').length,
    }

    return NextResponse.json({
      consent: {
        stats: consentStats,
        total: consentRecords.length,
        recent: consentRecords.slice(0, 50),
      },
      deletions: {
        stats: deletionStats,
        requests: deletionRequests,
      },
      exports: {
        last_30_days: recentExports.length,
        recent: recentExports.slice(0, 20),
      },
    })
  } catch (error) {
    console.error('Compliance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
