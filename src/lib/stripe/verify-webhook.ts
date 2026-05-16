import crypto from 'crypto'

export function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  const signatureHash = signature.split(',')[1].split('=')[1]

  return signatureHash === hash
}

export type StripeWebhookEventData = Record<string, unknown>

export type StripeWebhookEvent = {
  id: string
  object: string
  api_version: string
  created: number
  data: StripeWebhookEventData
  livemode: boolean
  pending_webhooks: number
  request?: {
    id: string | null
    idempotency_key: string | null
  }
  type: string
}
