import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'

const ALLOWED_CRON_PATHS = [
  '/api/cron/sync-ical',
  '/api/cron/daily-checkins',
  '/api/cron/cleanup',
]

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { path } = await request.json()

  if (!path || !ALLOWED_CRON_PATHS.includes(path)) {
    return NextResponse.json({ error: 'Cron path inválido' }, { status: 400 })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }

  const baseUrl = request.nextUrl.origin
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
