import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[sync-logs] Request received')
    const limit = request.nextUrl.searchParams.get('limit') || '50'
    console.log('[sync-logs] Limit:', limit)

    // Dynamic import to avoid circular dependencies
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = await createAdminClient()

    console.log('[sync-logs] Fetching logs...')
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('[sync-logs] Supabase error:', error)
      return NextResponse.json([], { status: 200 })
    }

    console.log('[sync-logs] Returned', (logs || []).length, 'logs')
    return NextResponse.json(logs || [])
  } catch (error) {
    console.error('[sync-logs] Fatal error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json([], { status: 200 })
  }
}
