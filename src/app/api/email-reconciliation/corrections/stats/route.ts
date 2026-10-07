import { requireRole } from '@/lib/auth/requireRole'
import { NextRequest, NextResponse } from 'next/server'
import { getCorrectionStats } from '@/lib/email-reconciliation/correction-service'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor'])
    if (!auth.authorized) return auth.response!
    const organizationId = auth.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 403 })
    }

    const stats = await getCorrectionStats(organizationId)

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
