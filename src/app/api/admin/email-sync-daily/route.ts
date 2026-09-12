import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) return NextResponse.json({ error: 'Organization unavailable' }, { status: 403 })
  try {
    const supabase = await createAdminClient()

    const daysParam = request.nextUrl.searchParams.get('days')
    const days = parseInt(daysParam || '7', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Buscar todas as extrações no período
    const { data: extractions, error } = await supabase
      .from('email_extractions')
      .select('created_at, match_status')
      .eq('organization_id', auth.organizationId)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Agrupar por dia
    const dailyMap = new Map<string, { total: number; synced: number; needsReview: number }>()

    extractions.forEach(ext => {
      const date = new Date(ext.created_at).toLocaleDateString('pt-BR')

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { total: 0, synced: 0, needsReview: 0 })
      }

      const day = dailyMap.get(date)!
      day.total++
      if (ext.match_status === 'auto_matched') day.synced++
      if (ext.match_status === 'needs_review') day.needsReview++
    })

    // Converter para array ordenado
    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      period: `last_${days}_days`,
      daily,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Email Sync Daily] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch daily metrics' }, { status: 500 })
  }
}
