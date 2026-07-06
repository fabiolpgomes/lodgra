import { NextRequest, NextResponse } from 'next/server'
import { importICalFromUrl, isBlockedEvent } from '@/lib/ical/icalService'

export const dynamic = 'force-dynamic'

interface ICalEvent {
  uid: string
  summary?: string
  description?: string
  start: string
  end: string
  isBlocked: boolean
  summaryLower?: string
}

interface SyncResult {
  url: string
  events: ICalEvent[]
  error: string | null
}

export async function GET(request: NextRequest) {
  try {
    // URLs do Airbnb e Booking
    const airbnbUrl = 'https://www.airbnb.pt/calendar/ical/1657439151572974398.ics?t=4d33a5bd1e7c4600848bc1d3c261074c'
    const bookingUrl = 'https://ical.booking.com/v1/export?t=b4508dde-4e9e-4cec-a215-db5c053dfc7d'

    const results: Record<string, SyncResult> = {
      airbnb: {
        url: airbnbUrl,
        events: [],
        error: null,
      },
      booking: {
        url: bookingUrl,
        events: [],
        error: null,
      },
    }

    // Test Airbnb
    try {
      const airbnbEvents = await importICalFromUrl(airbnbUrl)
      results.airbnb.events = airbnbEvents.map(event => ({
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        isBlocked: isBlockedEvent(event),
        summaryLower: event.summary?.toLowerCase(),
      }))
    } catch (err) {
      results.airbnb.error = err instanceof Error ? err.message : String(err)
    }

    // Test Booking
    try {
      const bookingEvents = await importICalFromUrl(bookingUrl)
      results.booking.events = bookingEvents.map(event => ({
        uid: event.uid,
        summary: event.summary,
        description: event.description,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        isBlocked: isBlockedEvent(event),
        summaryLower: event.summary?.toLowerCase(),
      }))
    } catch (err) {
      results.booking.error = err instanceof Error ? err.message : String(err)
    }

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
