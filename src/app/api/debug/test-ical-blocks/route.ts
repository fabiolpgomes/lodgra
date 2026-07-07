import { NextRequest, NextResponse } from 'next/server'
import { importICalFromUrl, isBlockedEvent } from '@/lib/ical/icalService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'Parâmetro "url" é obrigatório' }, { status: 400 })
    }

    // Importar eventos
    const events = await importICalFromUrl(url)

    // Testar cada evento
    const results = events.map((event) => {
      const isBlocked = isBlockedEvent(event)
      return {
        summary: event.summary,
        description: event.description?.substring(0, 200),
        uid: event.uid?.substring(0, 100),
        start: event.start.toISOString().split('T')[0],
        end: event.end.toISOString().split('T')[0],
        isBlocked,
        durationDays: Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60 * 24)),
      }
    })

    return NextResponse.json({
      total: events.length,
      blocked: results.filter(r => r.isBlocked).length,
      notBlocked: results.filter(r => !r.isBlocked).length,
      events: results,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar iCal' },
      { status: 500 }
    )
  }
}
