import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '50'
    const supabase = await createAdminClient()

    // Fetch recent sync logs with property name
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select(`
        *,
        property_listings(name)
      `)
      .order('synced_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('[sync-logs] Error fetching logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten property_listings data for easier use
    const enrichedLogs = (logs || []).map((log: any) => ({
      ...log,
      property_name: log.property_listings?.name || null,
      property_listings: undefined, // Remove nested object
    }))

    return NextResponse.json(enrichedLogs)
  } catch (error) {
    console.error('[sync-logs] Fatal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
