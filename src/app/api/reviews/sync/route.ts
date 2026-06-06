/**
 * API Route: /api/reviews/sync
 * Syncs reviews from OTAs (Booking, Airbnb, Google)
 * Can be triggered manually or via Vercel Cron
 *
 * TEMPORARILY DISABLED - Pending dependency installation and implementation
 * This endpoint will be restored once all review OTA integrations are properly configured
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: 'Reviews sync API is temporarily unavailable',
      reason: 'Dependencies for OTA integrations (Booking, Airbnb, Google) pending installation',
      status: 'pending',
    },
    { status: 503 }
  )
}
