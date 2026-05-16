/**
 * Google Vacation Rentals Feed API
 * GET /api/feeds/google-vacation-rentals
 *
 * Generates XML feed for Google's Vacation Rentals partner program
 * Supports pagination, filtering, and caching
 */

import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { generateGoogleVacationRentalsFeed, validateFeedStructure } from '@/lib/feeds/google-feed-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')
    const updated_since = searchParams.get('updated_since') || undefined
    const currency = searchParams.get('currency') || 'EUR'
    const include_reviews = searchParams.get('include_reviews') !== 'false' // Default: true

    // Validate parameters
    if (limit < 1 || limit > 1000) {
      return NextResponse.json({ error: 'Invalid limit (1-1000)' }, { status: 400 })
    }
    if (offset < 0) {
      return NextResponse.json({ error: 'Invalid offset (must be >= 0)' }, { status: 400 })
    }

    // Check for conditional request (If-None-Match)
    const clientETag = request.headers.get('if-none-match')

    // Generate feed
    const startTime = Date.now()
    const { xml, eTag, count } = await generateGoogleVacationRentalsFeed({
      limit,
      offset,
      updated_since,
      currency,
      include_reviews,
    })
    const generationTime = Date.now() - startTime

    // Validate feed structure
    if (!validateFeedStructure(xml)) {
      console.error('[Google Feed] Invalid feed structure generated')
      return NextResponse.json({ error: 'Feed generation failed' }, { status: 500 })
    }

    // Check ETag for caching
    if (clientETag === eTag) {
      return new NextResponse(null, { status: 304 })
    }

    // Prepare response headers
    const headers = new Headers({
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Content-Length': Buffer.byteLength(xml).toString(),
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'ETag': `"${eTag}"`,
      'Last-Modified': new Date().toUTCString(),
      'X-Feed-Count': count.toString(),
      'X-Generation-Time-Ms': generationTime.toString(),
    })

    return new NextResponse(xml, {
      status: 200,
      headers,
    })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'google-feed-generator' },
      level: 'error',
    })
    console.error('[Google Feed API] Error:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to generate feed' },
      { status: 500 }
    )
  }
}

export async function HEAD(request: NextRequest) {
  // HEAD request for feed validation
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')
    const updated_since = searchParams.get('updated_since') || undefined
    const currency = searchParams.get('currency') || 'EUR'
    const include_reviews = searchParams.get('include_reviews') !== 'false' // Default: true

    const { xml, eTag, count } = await generateGoogleVacationRentalsFeed({
      limit,
      offset,
      updated_since,
      currency,
      include_reviews,
    })

    const headers = new Headers({
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Content-Length': Buffer.byteLength(xml).toString(),
      'Cache-Control': 'public, max-age=3600',
      'ETag': `"${eTag}"`,
      'Last-Modified': new Date().toUTCString(),
      'X-Feed-Count': count.toString(),
    })

    return new NextResponse(null, { status: 200, headers })
  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'google-feed-generator-head' },
      level: 'warning',
    })
    return new NextResponse(null, { status: 500 })
  }
}
