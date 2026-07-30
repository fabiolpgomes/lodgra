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
      getUser: jest.fn(async () => ({
        data: { user: mockSessionUser },
        error: mockSessionUser ? null : { message: 'Not authenticated' },
      })),
    },
  })),
}))

// Mock Next.js server
jest.mock('next/server', () => {
  const createMockResponse = (body: any, options: any = {}) => {
    const headers = options?.headers || {}
    return {
      status: options?.status || 200,
      headers: {
        get: jest.fn((key: string) => {
          return headers[key] || null
        }),
      },
      json: jest.fn(async () => body),
      text: jest.fn(async () => body),
    }
  }

  const NextResponseJson = jest.fn((body: any, options: any = {}) => createMockResponse(body, options))
  const NextResponseConstructor = jest.fn(function (body: any, options: any) {
    return createMockResponse(body, options)
  }) as any

  NextResponseConstructor.json = NextResponseJson

  return {
    NextRequest: jest.fn(),
    NextResponse: NextResponseConstructor,
  }
})

// Mock Supabase admin client
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => {
    const createChainable = (resolveData: unknown = []) => {
      const chain: any = {
        // Implement Thenable interface for Promise.all() support
        then: (resolve: Function, reject?: Function) => {
          try {
            resolve({ data: resolveData, error: null })
          } catch (e) {
            reject?.(e)
          }
          return Promise.resolve({ data: resolveData, error: null })
        },
        catch: jest.fn().mockReturnThis(),
      }
      chain.select = jest.fn(() => chain)
      chain.eq = jest.fn(() => chain)
      chain.gte = jest.fn(() => chain)
      chain.in = jest.fn(() => chain)
      chain.order = jest.fn(() => chain)
      chain.limit = jest.fn(() => chain)
      chain.single = jest.fn(() => {
        const singleChain: any = {
          then: (resolve: Function, reject?: Function) => {
            try {
              resolve({ data: mockProfile, error: null })
            } catch (e) {
              reject?.(e)
            }
            return Promise.resolve({ data: mockProfile, error: null })
          },
        }
        return singleChain
      })
      chain.insert = jest.fn(async (data: Record<string, unknown>) => {
        mockInsertedAudit = data
        return { error: null }
      })
      return chain
    }

    return {
      from: jest.fn((table: string) => {
        if (table === 'user_profiles') return createChainable(mockProfile)
        if (table === 'audit_logs') return createChainable(mockAuditLogs)
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
      preferred_locale: 'pt-BR',
      organization_id: 'org-1',
      created_at: '2026-01-01T00:00:00Z',
    }
    mockAuditLogs = [] // No recent exports

    try {
      const response = await POST()
      expect(response.status).toBe(200)

      const contentType = response.headers.get('Content-Type')
      expect(contentType).toBe('application/json')

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('lodgra-data-export')

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
    } catch (error) {
      console.error('Data export test error:', error)
      throw error
    }
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
