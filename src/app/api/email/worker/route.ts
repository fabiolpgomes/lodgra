import { NextRequest, NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { dispatchEmailJob, EmailJob } from '@/lib/email/queue'

export const dynamic = 'force-dynamic'

function getReceiver(): Receiver | null {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY
  const next = process.env.QSTASH_NEXT_SIGNING_KEY
  if (!current || !next) return null
  return new Receiver({ currentSigningKey: current, nextSigningKey: next })
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await request.text()

  const receiver = getReceiver()
  if (receiver) {
    const signature = request.headers.get('upstash-signature') ?? ''
    try {
      await receiver.verify({ signature, body: rawBody })
    } catch {
      console.error('[EmailWorker] Assinatura QStash inválida')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // If signing keys are not configured, require the CRON_SECRET as fallback
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let job: EmailJob
  try {
    job = JSON.parse(rawBody) as EmailJob
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  try {
    await dispatchEmailJob(job)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[EmailWorker] Falha ao enviar email:', err)
    // Return 500 so QStash will retry
    return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
  }
}
