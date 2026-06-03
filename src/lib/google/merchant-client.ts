import * as Sentry from '@sentry/nextjs'

interface GoogleCredentials {
  serviceAccountEmail: string
  serviceAccountKeyId: string
  serviceAccountPrivateKey: string
  merchantCenterId: string
}

interface SyncResult {
  propertyId: string
  status: 'indexed' | 'pending' | 'rejected' | 'error'
  indexedDate?: string
  errorMessage?: string
  rawData?: unknown
}

export class GoogleMerchantClient {
  private accessToken: string | null = null
  private tokenExpiry: number | null = null
  private credentials: GoogleCredentials

  constructor() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const keyId = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    const merchantId = process.env.GOOGLE_MERCHANT_CENTER_ID

    if (!email || !keyId || !privateKey || !merchantId) {
      throw new Error(
        'Google Merchant API credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY_ID, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_MERCHANT_CENTER_ID'
      )
    }

    this.credentials = {
      serviceAccountEmail: email,
      serviceAccountKeyId: keyId,
      serviceAccountPrivateKey: privateKey,
      merchantCenterId: merchantId,
    }
  }

  /**
   * Get or refresh access token using JWT grant flow
   */
  private async getAccessToken(): Promise<string> {
    // Return existing token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const jwt = this.createJWT()
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }).toString(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Token fetch failed: ${error.error_description}`)
      }

      const data = (await response.json()) as {
        access_token: string
        expires_in: number
      }
      this.accessToken = data.access_token
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000 // 5min buffer

      return this.accessToken
    } catch (error) {
      Sentry.captureException(error, {
        tags: { component: 'GoogleMerchantClient', method: 'getAccessToken' },
      })
      throw error
    }
  }

  /**
   * Create JWT for Service Account authentication
   */
  private createJWT(): string {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto')

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT', kid: this.credentials.serviceAccountKeyId }
    const payload = {
      iss: this.credentials.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/merchant.products.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url')
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(`${headerEncoded}.${payloadEncoded}`)
      .sign(this.credentials.serviceAccountPrivateKey, 'base64url')

    return `${headerEncoded}.${payloadEncoded}.${signature}`
  }

  /**
   * Fetch product status from Google Merchant Center for a property
   */
  async getProductStatus(
    propertyId: string,
    retries = 3,
    delayMs = 1000
  ): Promise<SyncResult> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const token = await this.getAccessToken()

        // Call Google Merchant Center API
        const response = await fetch(
          `https://merchantapi.googleapis.com/merchantapi/reports_service_v1beta/accounts/${this.credentials.merchantCenterId}/productStatus?pageSize=100&filter=channel%3D%22ONLINE%22`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Google API error: ${JSON.stringify(error)}`)
        }

        const data = (await response.json()) as {
          products?: Array<{
            name: string
            title: string
            resourceStatus?: {
              destination: string
              status: string
            }
            issueAggregate?: {
              severities: Array<{ severity: string }>
            }
            creationTime?: string
            lastUpdateTime?: string
          }>
        }

        // Find product matching property ID
        const product = data.products?.find((p) => p.name.includes(propertyId))

        if (!product) {
          return {
            propertyId,
            status: 'pending',
            errorMessage: 'Product not yet indexed',
            rawData: data,
          }
        }

        // Determine status
        const status = this.mapGoogleStatus(product.resourceStatus?.status)

        return {
          propertyId,
          status,
          indexedDate: product.lastUpdateTime || product.creationTime,
          rawData: product,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s, 8s
          const delay = delayMs * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    Sentry.captureException(lastError, {
      tags: { component: 'GoogleMerchantClient', method: 'getProductStatus', propertyId },
      extra: { retries, lastError: lastError?.message },
    })

    return {
      propertyId,
      status: 'error',
      errorMessage: lastError?.message || 'Failed to fetch product status',
    }
  }

  /**
   * Map Google's status to our standard status values
   */
  private mapGoogleStatus(
    googleStatus?: string
  ): 'indexed' | 'pending' | 'rejected' | 'error' {
    if (!googleStatus) return 'pending'

    const status = googleStatus.toUpperCase()
    if (status === 'ACTIVE' || status === 'APPROVED') return 'indexed'
    if (status === 'PENDING_REVIEW' || status === 'PENDING') return 'pending'
    if (status === 'REJECTED' || status === 'DISAPPROVED') return 'rejected'

    return 'error'
  }
}
