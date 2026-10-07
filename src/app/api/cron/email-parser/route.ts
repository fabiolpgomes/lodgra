import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import { ingestGmail } from '@/lib/email-reconciliation/gmail-ingestion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Compatibility URL for the scheduler; the legacy reservation writer is retired. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await ingestGmail()
    return NextResponse.json({ success: result.errors === 0, ...result }, { status: result.errors ? 503 : 200 })
  } catch {
    return NextResponse.json({ error: 'Gmail ingestion unavailable' }, { status: 503 })
  }
}
