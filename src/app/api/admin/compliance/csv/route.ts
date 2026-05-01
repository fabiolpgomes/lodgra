import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'

function csvEscape(value: string | number | null | undefined | boolean): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent formula injection
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  // Escape double quotes
  str = str.replace(/"/g, '""');
  // Wrap in quotes if it contains comma, newline, or quote
  if (/[,\n"]/.test(str)) {
    return `"${str}"`;
  }
  return str;
}

/**
 * GET /api/admin/compliance/csv — Export compliance report as CSV
 * Story 11.5: For audit purposes
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

    // Fetch consent records and deletion requests — org-scoped (AC8)
    const [consentResult, deletionResult] = await Promise.all([
      adminClient
        .from('consent_records')
        .select('id, user_id, consent_type, consent_value, ip_address, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1000),
      adminClient
        .from('deletion_requests')
        .select('id, user_id, requested_at, scheduled_at, status, cancelled_at, completed_at')
        .eq('organization_id', organizationId)
        .order('requested_at', { ascending: false }),
    ])

    const consentRecords = consentResult.data || []
    const deletionRequests = deletionResult.data || []

    // Build CSV
    const lines: string[] = []

    // Section: Consent Records
    lines.push('=== CONSENT RECORDS ===')
    lines.push('id,user_id,consent_type,consent_value,ip_address,created_at')
    for (const r of consentRecords) {
      lines.push(`${csvEscape(r.id)},${csvEscape(r.user_id || 'anonymous')},${csvEscape(r.consent_type)},${csvEscape(r.consent_value)},${csvEscape(r.ip_address || '')},${csvEscape(r.created_at)}`)
    }

    lines.push('')
    lines.push('=== DELETION REQUESTS ===')
    lines.push('id,user_id,requested_at,scheduled_at,status,cancelled_at,completed_at')
    for (const r of deletionRequests) {
      lines.push(`${csvEscape(r.id)},${csvEscape(r.user_id)},${csvEscape(r.requested_at)},${csvEscape(r.scheduled_at)},${csvEscape(r.status)},${csvEscape(r.cancelled_at || '')},${csvEscape(r.completed_at || '')}`)
    }

    const csv = lines.join('\n')
    const date = new Date().toISOString().split('T')[0]

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="compliance-report-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('Compliance CSV error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
