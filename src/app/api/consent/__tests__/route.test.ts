/**
 * Unit Tests for Consent API (Story 11.1)
 *
 * Tests:
 * 1. POST — registers consent for anonymous user
 * 2. POST — registers consent for authenticated user
 * 3. POST — rejects invalid consent_type
 * 4. POST — rejects missing consent_value
 * 5. GET — returns latest consent records for authenticated user
 * 6. GET — returns 401 for unauthenticated user
 */

import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Track mock state
let mockSessionUser: { id: string } | null = null
let mockInsertData: Record<string, unknown> | null = null
let mockInsertError: { message: string } | null = null
let mockSelectData: Array<Record<string, unknown>> = []

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getSession: jest.fn(async () => ({
        data: {
          session: mockSessionUser ? { user: mockSessionUser } : null,
        },
      })),
    },
  })),
}))

// Mock Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => {
    type ChainableMock = {
      select: jest.Mock
      eq: jest.Mock
      order: jest.Mock
      insert: jest.Mock
    }
    const chainable: ChainableMock = {
      select: jest.fn(() => chainable),
      eq: jest.fn(() => chainable),
      order: jest.fn(async () => ({
        data: mockSelectData,
        error: null,
      })),
      insert: jest.fn(async (data: Record<string, unknown>) => {
        mockInsertData = data
        return { error: mockInsertError }
      }),
    }
    return {
      from: jest.fn(() => chainable),
    }
  }),
}))

function createRequest(body: Record<string, unknown>, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost:3000/api/consent', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'TestAgent/1.0',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/consent', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockInsertData = null
    mockInsertError = null
    mockSelectData = []
  })

  it('registers consent for anonymous user', async () => {
    const request = createRequest({
      consent_type: 'analytics',
      consent_value: true,
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockInsertData).toMatchObject({
      user_id: null,
      consent_type: 'analytics',
      consent_value: true,
      ip_address: '192.168.1.1',
      user_agent: 'TestAgent/1.0',
    })
  })

  it('registers consent for authenticated user', async () => {
    mockSessionUser = { id: 'user-123' }

    const request = createRequest({
      consent_type: 'analytics',
      consent_value: false,
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockInsertData).toMatchObject({
      user_id: 'user-123',
      consent_type: 'analytics',
      consent_value: false,
    })
  })

  it('rejects invalid consent_type', async () => {
    const request = createRequest({
      consent_type: 'tracking',
      consent_value: true,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects missing consent_value', async () => {
    const request = createRequest({
      consent_type: 'analytics',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects non-boolean consent_value', async () => {
    const request = createRequest({
      consent_type: 'analytics',
      consent_value: 'yes',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('accepts essential consent type', async () => {
    const request = createRequest({
      consent_type: 'essential',
      consent_value: true,
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('accepts marketing consent type', async () => {
    const request = createRequest({
      consent_type: 'marketing',
      consent_value: false,
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('returns 500 on database error', async () => {
    mockInsertError = { message: 'DB error' }

    const request = createRequest({
      consent_type: 'analytics',
      consent_value: true,
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})

describe('GET /api/consent', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockInsertData = null
    mockInsertError = null
    mockSelectData = []
  })

  it('returns 401 for unauthenticated user', async () => {
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it('returns latest consent records for authenticated user', async () => {
    mockSessionUser = { id: 'user-123' }
    mockSelectData = [
      { consent_type: 'analytics', consent_value: true, created_at: '2026-04-06T12:00:00Z' },
      { consent_type: 'analytics', consent_value: false, created_at: '2026-04-05T12:00:00Z' },
      { consent_type: 'essential', consent_value: true, created_at: '2026-04-06T11:00:00Z' },
    ]

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.consents.analytics).toEqual({
      consent_value: true,
      created_at: '2026-04-06T12:00:00Z',
    })
    expect(json.consents.essential).toEqual({
      consent_value: true,
      created_at: '2026-04-06T11:00:00Z',
    })
  })

  it('returns empty consents for user with no records', async () => {
    mockSessionUser = { id: 'user-456' }
    mockSelectData = []

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.consents).toEqual({})
  })
})
