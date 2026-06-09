/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for /api/auth/identify-org endpoint
 *
 * Note: Mocking Upstash requires special handling for the Ratelimit class.
 * We mock it to always allow requests for testing purposes.
 */

// Mock lib first
jest.mock('@/lib/auth/identify-org', () => ({
  identifyOrgByEmail: jest.fn(),
  validateEmail: jest.fn(),
}))

// Mock Upstash Redis and Ratelimit
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => ({})),
}))

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: jest.fn(function () {
    this.limit = jest.fn().mockResolvedValue({ success: true, pending: true, retryAfter: 0 })
    return this
  }),
}))

// Add the static method to the Ratelimit mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RatelimitMock = require('@upstash/ratelimit').Ratelimit
RatelimitMock.slidingWindow = jest.fn(() => ({}))

// Import POST after mocks are set up
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST } = require('@/app/api/auth/identify-org/route')

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { identifyOrgByEmail, validateEmail } = require('@/lib/auth/identify-org')

describe('/api/auth/identify-org', () => {
  const mockValidateEmail = validateEmail
  const mockIdentifyOrgByEmail = identifyOrgByEmail

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - Valid email', () => {
    it('returns organization data when email matches', async () => {
      mockValidateEmail.mockReturnValue(true)
      mockIdentifyOrgByEmail.mockResolvedValue({
        orgName: 'Algarve Home Stay',
        orgSlug: 'algarve-home-stay',
        orgLogoUrl: 'https://images.lodgra.io/logos/algarve.png',
      })

      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'user@algarve-home-stay.com' }),
      }) as any

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        orgName: 'Algarve Home Stay',
        orgSlug: 'algarve-home-stay',
        orgLogoUrl: 'https://images.lodgra.io/logos/algarve.png',
      })
      expect(mockValidateEmail).toHaveBeenCalledWith('user@algarve-home-stay.com')
    })

    it('returns nulls when email does not exist', async () => {
      mockValidateEmail.mockReturnValue(true)
      mockIdentifyOrgByEmail.mockResolvedValue({
        orgName: null,
        orgSlug: null,
        orgLogoUrl: null,
      })

      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        orgName: null,
        orgSlug: null,
        orgLogoUrl: null,
      })
    })

    it('handles case-insensitive email lookup', async () => {
      mockValidateEmail.mockReturnValue(true)
      mockIdentifyOrgByEmail.mockResolvedValue({
        orgName: 'Test Company',
        orgSlug: 'test-company',
        orgLogoUrl: null,
      })

      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'USER@TEST.COM' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.orgName).toBe('Test Company')
      expect(mockIdentifyOrgByEmail).toHaveBeenCalledWith('USER@TEST.COM')
    })
  })

  describe('POST - Invalid input', () => {
    it('returns 400 when email is missing', async () => {
      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('email is required')
    })

    it('returns 400 when email format is invalid', async () => {
      mockValidateEmail.mockReturnValue(false)

      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'invalid-email' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid email format')
    })

    it('returns 400 when email is not a string', async () => {
      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 12345 }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('email is required')
    })
  })

  describe('POST - Error handling', () => {
    it('returns 500 when Supabase query fails', async () => {
      mockValidateEmail.mockReturnValue(true)
      mockIdentifyOrgByEmail.mockRejectedValue(new Error('Supabase connection error'))

      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({ email: 'user@example.com' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('returns 500 on invalid JSON body', async () => {
      const req = new Request('http://localhost:3000/api/auth/identify-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
        },
        body: 'invalid json',
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

})

