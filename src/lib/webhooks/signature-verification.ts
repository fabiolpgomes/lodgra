import crypto from 'crypto'

export interface WebhookSignatureResult {
  valid: boolean
  error?: string
}

export function verifySendGridSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): WebhookSignatureResult {
  if (!signature || !timestamp || !secret) {
    return {
      valid: false,
      error: 'Missing signature, timestamp, or secret',
    }
  }

  try {
    // SendGrid signature verification: HMAC-SHA256(secret, timestamp + payload)
    const signedContent = timestamp + payload
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    return {
      valid: isValid,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

export function verifyTwilioSignature(
  url: string,
  data: Record<string, string>,
  signature: string,
  authToken: string
): WebhookSignatureResult {
  if (!signature || !authToken) {
    return {
      valid: false,
      error: 'Missing signature or auth token',
    }
  }

  try {
    // Twilio signature verification: HMAC-SHA1(authToken, url + params)
    let content = url

    // Sort and append parameters
    const sortedKeys = Object.keys(data).sort()
    for (const key of sortedKeys) {
      content += key + data[key]
    }

    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(content)
      .digest('base64')

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )

    return {
      valid: isValid,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

export function verifyWebhookTimestamp(
  timestamp: string,
  maxAgeSeconds: number = 300
): WebhookSignatureResult {
  try {
    const webhookTime = parseInt(timestamp)
    const now = Math.floor(Date.now() / 1000)
    const age = now - webhookTime

    if (age < 0) {
      return {
        valid: false,
        error: 'Webhook timestamp is in the future',
      }
    }

    if (age > maxAgeSeconds) {
      return {
        valid: false,
        error: `Webhook too old: ${age}s > ${maxAgeSeconds}s`,
      }
    }

    return {
      valid: true,
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid timestamp format',
    }
  }
}
