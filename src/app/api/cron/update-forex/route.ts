/**
 * Cron Job: Update Forex Rates
 * Run this periodically (e.g., every hour) to refresh exchange rates
 * Secured with CRON_SECRET from environment
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateRates } from '@/lib/forex/rates'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    console.error('[cron/update-forex] Unauthorized attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rates = await updateRates()
    console.log('[cron/update-forex] Successfully updated rates:', rates)

    return NextResponse.json(
      {
        success: true,
        message: 'Forex rates updated successfully',
        rates,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[cron/update-forex] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
