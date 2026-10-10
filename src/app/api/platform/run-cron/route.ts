import { NextRequest, NextResponse } from 'next/server'
import { recordPlatformAudit, requirePlatformAdmin } from '@/lib/auth/platform-admin'
import { isPlatformCronPath } from '@/lib/platform/cron-jobs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdmin()
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => null)
  const path: unknown = body?.path

  if (!isPlatformCronPath(path)) {
    return NextResponse.json({ error: 'Cron path inválido' }, { status: 400 })
  }

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }

  // Auditoria primeiro: sem registo, a ação não corre.
  const audited = await recordPlatformAudit({
    actorUserId: auth.userId,
    action: 'cron.run',
    target: path,
  })
  if (!audited) {
    return NextResponse.json({ error: 'Não foi possível registar a auditoria' }, { status: 503 })
  }

  try {
    const response = await fetch(`${request.nextUrl.origin}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    const data = await response.json().catch(() => ({ error: 'Resposta inválida do cron' }))
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('[platform/run-cron] falha ao chamar o cron:', path, error)
    return NextResponse.json({ error: 'Falha ao executar o cron' }, { status: 502 })
  }
}
