import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Email parsing endpoint - DEPRECATED
 * This endpoint has been disabled in favor of iCal integration
 * which is more reliable and supports multiple platforms
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Email parsing has been deprecated. Use iCal import instead.' },
    { status: 410 }
  )
}
