/**
 * Unit Tests for Delete Request API (Story 11.4)
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

let mockSessionUser: { id: string } | null = null
let mockPendingRequests: Array<Record<string, unknown>> = []
let mockInsertedData: Record<string, unknown> | null = null
let mockInsertedAudit: Record<string, unknown> | null = null

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: mockSessionUser ? { user: mockSessionUser } : null },
      })),
    },
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => {
    const createChain = (data: unknown = []) => {
      const chain: Record<string, jest.Mock> = {}
      chain.select = jest.fn(() => chain)
      chain.eq = jest.fn(() => chain)
      chain.order = jest.fn(() => chain)
      chain.limit = jest.fn(() => Promise.resolve({ data, error: null }))
      chain.single = jest.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : null, error: null }))
      chain.insert = jest.fn(async (d: Record<string, unknown>) => {
        // Track both audit and deletion inserts
        if ('action' in d) mockInsertedAudit = d
        else mockInsertedData = d
        return { error: null }
      })
      return chain
    }
    return {
      from: jest.fn((table: string) => {
        if (table === 'deletion_requests') return createChain(mockPendingRequests)
        if (table === 'audit_logs') return createChain([])
        return createChain([])
      }),
    }
  }),
}))

describe('POST /api/user/delete-request', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockPendingRequests = []
    mockInsertedData = null
    mockInsertedAudit = null
  })

  // Helper object to satisfy NextRequest parameter types in test calls
  const mockRequest = { headers: new Headers({ origin: 'http://localhost:3000' }) } as unknown as NextRequest

  it('returns 401 for unauthenticated user', async () => {
    const res = await POST(mockRequest)
    expect(res.status).toBe(401)
  })

  it('creates deletion request with 30-day schedule', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = []

    const res = await POST(mockRequest)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.cooling_off_days).toBe(30)
    expect(json.scheduled_at).toBeDefined()

    // Verify scheduled_at is ~30 days from now
    const scheduled = new Date(json.scheduled_at)
    const now = new Date()
    const diffDays = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(29)
    expect(diffDays).toBeLessThan(31)
  })

  it('returns 409 if pending request exists', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = [{ id: 'req-1', scheduled_at: '2026-05-07T00:00:00Z' }]

    const res = await POST(mockRequest)
    expect(res.status).toBe(409)
  })

  it('logs deletion request in audit', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = []

    await POST(mockRequest)
    expect(mockInsertedAudit).toBeDefined()
    expect(mockInsertedAudit?.action).toBe('deletion_requested')
  })
})

describe('GET /api/user/delete-request', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockPendingRequests = []
  })

  it('returns 401 for unauthenticated user', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns null if no pending request', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = []

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.pending_request).toBeNull()
  })

  it('returns pending request details', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = [{
      id: 'req-1',
      requested_at: '2026-04-07T00:00:00Z',
      scheduled_at: '2026-05-07T00:00:00Z',
      status: 'pending',
    }]

    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.pending_request.id).toBe('req-1')
  })
})
