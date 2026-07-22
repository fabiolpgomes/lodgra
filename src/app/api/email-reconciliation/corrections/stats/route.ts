import { NextRequest, NextResponse } from 'next/server'
import { getCorrectionStats } from '@/lib/email-reconciliation/correction-service'

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.headers.get('x-organization-id')

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organization ID' }, { status: 400 })
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
