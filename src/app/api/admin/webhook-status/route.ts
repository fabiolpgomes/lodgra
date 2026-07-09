import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Endpoint para debug e status dos webhooks
 * GET /api/admin/webhook-status?platform=booking
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const platform = request.nextUrl.searchParams.get('platform') || 'booking'

    const { data: events, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('webhook_type', platform)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const stats = {
      total: events?.length || 0,
      processed: events?.filter((e) => e.status === 'processed').length || 0,
      pending: events?.filter((e) => e.status === 'pending').length || 0,
      failed: events?.filter((e) => e.status === 'failed').length || 0,
    }

    const lastEvent = events?.[0]

    return NextResponse.json({
      platform,
      webhook_url: `https://www.lodgra.io/api/webhooks/${platform}/reservation`,
      status: stats.pending === 0 && stats.failed === 0 ? 'active' : 'warning',
      stats,
      last_event_received: lastEvent?.created_at || null,
      recent_events: events?.slice(0, 5) || [],
    })
  } catch (error: unknown) {
    console.error('[Webhook Status] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
