import { Client } from '@upstash/qstash'
import {
  sendOwnerReservationNotification,
  sendOwnerCancellationNotification,
} from '@/lib/email/resend'

// ─── Job payload types ────────────────────────────────────────────────────────

export interface OwnerReservationJob {
  type: 'owner_reservation'
  ownerName: string
  ownerEmail: string
  guestName: string
  propertyName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount?: string
  currency?: string
  source?: string
}

export interface OwnerCancellationJob {
  type: 'owner_cancellation'
  ownerName: string
  ownerEmail: string
  guestName: string
  propertyName: string
  checkIn: string
  checkOut: string
  nights: number
  cancellationReason?: string
  source?: string
}

export type EmailJob = OwnerReservationJob | OwnerCancellationJob

// ─── QStash client singleton ──────────────────────────────────────────────────

let _qstash: Client | null = null

function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) return null
  if (!_qstash) _qstash = new Client({ token: process.env.QSTASH_TOKEN })
  return _qstash
}

// ─── Enqueue or send directly ─────────────────────────────────────────────────

/**
 * Enqueue an email job via QStash.
 * Falls back to direct send if QSTASH_TOKEN is not configured (dev/local).
 */
export async function enqueueEmail(job: EmailJob): Promise<void> {
  const client = getQStashClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (client && appUrl) {
    try {
      await client.publishJSON({
        url: `${appUrl}/api/email/worker`,
        body: job,
        retries: 3,
      })
      return
    } catch (err) {
      console.error('[EmailQueue] Falha ao enfileirar via QStash, enviando direto:', err)
    }
  }

  // Fallback: send synchronously (no QSTASH_TOKEN or publish failed)
  await dispatchEmailJob(job)
}

// ─── Dispatcher (used by both fallback and worker endpoint) ───────────────────

export async function dispatchEmailJob(job: EmailJob): Promise<void> {
  if (job.type === 'owner_reservation') {
    await sendOwnerReservationNotification(job)
  } else if (job.type === 'owner_cancellation') {
    await sendOwnerCancellationNotification(job)
  }
}
