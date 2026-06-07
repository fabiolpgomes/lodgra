/**
 * Google Credentials Validation on Startup
 * Ensures Google Service Account credentials are valid before processing reviews
 */

import { GoogleClient } from '@/lib/reviews/google-client'

export async function validateGoogleCredentials(): Promise<void> {
  // Only validate in production
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  // Skip if Google credentials not configured
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    console.warn('[Init] Google Service Account not configured (GOOGLE_SERVICE_ACCOUNT_PATH missing)')
    return
  }

  try {
    const googleClient = new GoogleClient(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)
    const isValid = await googleClient.validateCredentials()

    if (isValid) {
      console.log(
        `[Init] ✓ Google Service Account credentials validated (key: ${process.env.GOOGLE_KEY_VERSION || 'unknown'})`
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Init] ✗ Google Service Account validation failed:', message)
    throw new Error(`Google credentials validation failed at startup: ${message}`)
  }
}
