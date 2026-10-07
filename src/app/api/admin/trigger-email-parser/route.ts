import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { ingestGmail } from '@/lib/email-reconciliation/gmail-ingestion'

export const maxDuration = 300

export async function POST() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organization unavailable' }, { status: 403 })
  try {
    const result = await ingestGmail(auth.organizationId)
    return NextResponse.json({ success: result.errors === 0, ...result }, { status: result.errors ? 503 : 200 })
  } catch {
    return NextResponse.json({ error: 'Gmail ingestion unavailable' }, { status: 503 })
  }
}
