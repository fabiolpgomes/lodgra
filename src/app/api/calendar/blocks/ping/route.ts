import { NextResponse } from 'next/server'

export async function GET() {
  console.log('[Calendar Blocks] PING endpoint called')
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}

export async function DELETE() {
  console.log('[Calendar Blocks] PING DELETE called')
  return NextResponse.json({ status: 'ping delete ok' })
}
