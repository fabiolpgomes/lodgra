/**
 * Unit Tests for Data Export API (Story 11.3)
 *
 * Tests:
 * 1. POST — returns 401 for unauthenticated user
 * 2. POST — returns JSON with all user data tables
 * 3. POST — returns 429 if export already done in last 24h
 * 4. POST — logs export in audit_logs
 */

import { POST } from '../route'

let mockSessionUser: { id: string } | null = null
let mockProfile: Record<string, unknown> | null = null
let mockAuditLogs: Array<Record<string, unknown>> = []
let mockInsertedAudit: Record<string, unknown> | null = null

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
    const createChainable = (resolveData: unknown = []) => {
      const chain: Record<string, jest.Mock> = {}
      chain.select = jest.fn(() => chain)
      chain.eq = jest.fn(() => chain)
      chain.gte = jest.fn(() => chain)
      chain.in = jest.fn(() => chain)
      chain.order = jest.fn(() => chain)
      chain.limit = jest.fn(() => Promise.resolve({ data: resolveData, error: null }))
      chain.single = jest.fn(() => Promise.resolve({ data: mockProfile, error: null }))
      chain.insert = jest.fn(async (data: Record<string, unknown>) => {
        mockInsertedAudit = data
        return { error: null }
      })
      return chain
    }

    return {
      from: jest.fn((table: string) => {
        if (table === 'user_profiles') return createChainable(mockProfile)
        if (table === 'audit_logs') {
          const chain = createChainable(mockAuditLogs)
          return chain
        }
        return createChainable([])
      }),
    }
  }),
}))

describe('POST /api/user/data-export', () => {
  beforeEach(() => {
    mockSessionUser = null
    mockProfile = null
    mockAuditLogs = []
    mockInsertedAudit = null
  })

  it('returns 401 for unauthenticated user', async () => {
    const response = await POST()
    expect(response.status).toBe(401)
  })

  it('returns JSON export for authenticated user', async () => {
    mockSessionUser = { id: 'user-123' }
    mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'admin',
      preferred_locale: 'pt',
      organization_id: 'org-1',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockAuditLogs = [] // No recent exports

    const response = await POST()
    expect(response.status).toBe(200)

    const contentType = response.headers.get('Content-Type')
    expect(contentType).toBe('application/json')

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain('homestay-data-export')

    const body = JSON.parse(await response.text())
    expect(body.export_date).toBeDefined()
    expect(body.export_version).toBe('1.0')
    expect(body.user.email).toBe('test@example.com')
    expect(body).toHaveProperty('properties')
    expect(body).toHaveProperty('reservations')
    expect(body).toHaveProperty('expenses')
    expect(body).toHaveProperty('owners')
    expect(body).toHaveProperty('consent_records')
    expect(body).toHaveProperty('audit_logs')
  })

  it('returns 429 if export done in last 24h', async () => {
    mockSessionUser = { id: 'user-123' }
    mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      organization_id: 'org-1',
    }
    mockAuditLogs = [{ id: 'log-1' }] // Recent export exists

    const response = await POST()
    expect(response.status).toBe(429)
  })

  it('logs export in audit_logs', async () => {
    mockSessionUser = { id: 'user-123' }
    mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      organization_id: 'org-1',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockAuditLogs = []

    await POST()

    expect(mockInsertedAudit).toBeDefined()
    expect(mockInsertedAudit?.user_id).toBe('user-123')
    expect(mockInsertedAudit?.action).toBe('data_export_requested')
  })
})
