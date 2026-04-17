/**
 * Unit Tests for Cancel Deletion API (Story 11.4)
 */

import { POST } from '../route'
import type { NextRequest } from 'next/server'

let mockSessionUser: { id: string } | null = null
let mockPendingRequests: Array<Record<string, unknown>> = []
let mockUpdatedData: Record<string, unknown> | null = null
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
      chain.limit = jest.fn(() => Promise.resolve({ data, error: null }))
      chain.update = jest.fn((d: Record<string, unknown>) => {
        mockUpdatedData = d
        return { eq: jest.fn(() => Promise.resolve({ error: null })) }
      })
      chain.insert = jest.fn(async (d: Record<string, unknown>) => {
        mockInsertedAudit = d
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

describe('POST /api/user/cancel-deletion', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockPendingRequests = []
    mockUpdatedData = null
    mockInsertedAudit = null
  })

  it('returns 401 for unauthenticated user', async () => {
    const req = { headers: { get: () => '127.0.0.1' } } as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 if no pending request', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = []

    const req = { headers: { get: () => '127.0.0.1' } } as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('cancels pending request', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = [{ id: 'req-1' }]

    const req = { headers: { get: () => '127.0.0.1' } } as unknown as NextRequest
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockUpdatedData?.status).toBe('cancelled')
    expect(mockUpdatedData?.cancelled_at).toBeDefined()
  })

  it('logs cancellation in audit', async () => {
    mockSessionUser = { id: 'user-1' }
    mockPendingRequests = [{ id: 'req-1' }]

    const req = { headers: { get: () => '127.0.0.1' } } as unknown as NextRequest
    await POST(req)
    expect(mockInsertedAudit?.action).toBe('deletion_cancelled')
  })
})
