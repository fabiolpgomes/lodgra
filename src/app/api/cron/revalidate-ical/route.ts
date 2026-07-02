import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

/**
 * POST /api/cron/revalidate-ical
 *
 * Periodic iCal cache revalidation
 * Runs every 30 minutes to ensure platforms see calendar updates quickly
 * instead of waiting for their default 24h polling cycle
 *
 * Called by Vercel Crons (vercel.json)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      console.warn('[Cron] Unauthorized revalidate-ical request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting iCal revalidation...')

    // Revalidate all calendar and reservation related paths
    // This forces Next.js to regenerate ISR cache
    revalidatePath('/(locale)/calendar', 'page')
    revalidatePath('/(locale)/reservations', 'page')
    revalidatePath('/(locale)/dashboard', 'page')
    revalidatePath('/booking', 'page')

    console.log('[Cron] iCal cache revalidated successfully')

    return NextResponse.json({
      success: true,
      message: 'iCal cache revalidated - platforms will see updates on next polling',
      timestamp: new Date().toISOString(),
      paths_revalidated: [
        '/(locale)/calendar',
        '/(locale)/reservations',
        '/(locale)/dashboard',
        '/booking',
      ],
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Cron] Revalidation error:', errorMsg)

    return NextResponse.json(
      {
        error: 'Revalidation failed',
        details: errorMsg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
