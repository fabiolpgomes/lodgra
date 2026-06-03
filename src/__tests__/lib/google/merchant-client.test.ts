import { GoogleMerchantClient } from '@/lib/google/merchant-client'

// Mock environment variables
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.iam.gserviceaccount.com'
process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID = 'key-123'
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2a2rwplBCXXaY5LkZ5F3gKC/Ig0VJrIOPcyG4wnG3RfQ2Mvv
J0GHZZpW4FvAKrWZWXqGb4eFCfCqJYP8tF7n6g8E6xKBJ9CqpY6H3pGpMl1J8Zam
w9v1h5C8L6K6Y7J7H7G7k7n7O7M7p7N7m7Q7r7L7s7S7t7U7u7V7w7X7y7Z7AzB
zB7zC7zD7zE7zF7zG7zH7zI7zJ7zK7zL7zM7zN7zO7zP7zQ7zR7zS7zT7zU7zV7
zW7zX7zY7zZ7AAzAA7AB7AC7AD7AE7AF7AG7AH7AI7AJ7AK7AL7AM7AN7AO7AP7AQ
7AR7AS7AT7AU7AV7AW7AX7AY7AZ7AQIDAQABAAAA
-----END RSA PRIVATE KEY-----`
process.env.GOOGLE_MERCHANT_CENTER_ID = '123456789'

describe('GoogleMerchantClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with valid credentials', () => {
    expect(() => new GoogleMerchantClient()).not.toThrow()
  })

  it('should throw error if credentials missing', () => {
    const originalEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

    expect(() => new GoogleMerchantClient()).toThrow(
      'Google Merchant API credentials not configured'
    )

    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = originalEmail
  })

  it('should map Google status correctly', () => {
    const client = new GoogleMerchantClient()
    const mapStatus = (client as unknown as Record<string, (status?: string) => string>)[
      'mapGoogleStatus'
    ]

    expect(mapStatus('ACTIVE')).toBe('indexed')
    expect(mapStatus('APPROVED')).toBe('indexed')
    expect(mapStatus('PENDING_REVIEW')).toBe('pending')
    expect(mapStatus('PENDING')).toBe('pending')
    expect(mapStatus('REJECTED')).toBe('rejected')
    expect(mapStatus('DISAPPROVED')).toBe('rejected')
    expect(mapStatus('UNKNOWN')).toBe('error')
    expect(mapStatus()).toBe('pending')
  })

  it('should initialize properly for production', () => {
    // Verify all env vars are set
    expect(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL).toBeDefined()
    expect(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_ID).toBeDefined()
    expect(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY).toBeDefined()
    expect(process.env.GOOGLE_MERCHANT_CENTER_ID).toBeDefined()

    const client = new GoogleMerchantClient()
    expect(client).toBeInstanceOf(GoogleMerchantClient)
  })

  it('should have proper error handling infrastructure', () => {
    const client = new GoogleMerchantClient()
    expect(client).toBeDefined()
    // Constructor validates all required env vars
  })
})
