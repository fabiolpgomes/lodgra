import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (apenas admin)
    const supabase = await createAdminClient()

    const daysParam = request.nextUrl.searchParams.get('days')
    const days = parseInt(daysParam || '7', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Buscar métricas
    const { data: extractions, error } = await supabase
      .from('email_extractions')
      .select('sync_status, match_status')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    const total = extractions.length
    const synced = extractions.filter(e => e.sync_status === 'synced').length
    const needsReview = extractions.filter(e => e.match_status === 'needs_review').length

    const syncRate = total > 0 ? (synced / total) * 100 : 0
    const needsReviewRate = total > 0 ? (needsReview / total) * 100 : 0

    // Determinar status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (needsReviewRate > 15) status = 'critical'
    else if (needsReviewRate > 10) status = 'warning'

    return NextResponse.json({
      period: `last_${days}_days`,
      total,
      synced,
      needsReview,
      syncRate,
      needsReviewRate,
      status,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Email Sync Metrics] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
