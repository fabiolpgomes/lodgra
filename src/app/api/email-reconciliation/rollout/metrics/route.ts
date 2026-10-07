import { requireRole } from '@/lib/auth/requireRole'
import { NextRequest, NextResponse } from 'next/server'
import { generateRolloutReport } from '@/lib/email-reconciliation/rollout-metrics'

/**
 * AC8: Rollout metrics API endpoint
 * GET /api/email-reconciliation/rollout/metrics
 *
 * Returns:
 * - Matching metrics (auto_matched%, needs_review%, no_match%)
 * - Duplication check (must be 0)
 * - Property association check (must be 0)
 * - Overall status (all checks pass?)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!
    const organizationId = auth.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 403 })
    }

    // Optional: filter by days since pilot start
    const sinceParam = request.nextUrl.searchParams.get('since_days')
    let sinceDate: Date | undefined

    if (sinceParam) {
      const daysSince = parseInt(sinceParam, 10)
      if (!isNaN(daysSince)) {
        sinceDate = new Date()
        sinceDate.setDate(sinceDate.getDate() - daysSince)
      }
    }

    const report = await generateRolloutReport(organizationId, sinceDate)

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
