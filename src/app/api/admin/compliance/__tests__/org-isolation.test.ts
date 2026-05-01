/**
 * Tests: Multi-tenant org isolation for compliance API (Story 11.6 — AC9)
 *
 * Verifies that admin queries are scoped to their own organization_id.
 */

import { GET } from '../route'

const ORG_A = 'org-a-0000-0000-0000-000000000001'
const ORG_B = 'org-b-0000-0000-0000-000000000002'

const queriedOrgByTable: Record<string, string | undefined> = {}

let mockAuthResult: { authorized: boolean; organizationId?: string } = { authorized: false }

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => mockAuthResult),
}))

const consentByOrg: Record<string, unknown[]> = {
  [ORG_A]: [
    { consent_type: 'analytics', consent_value: true,  user_id: 'user-a1', created_at: '2026-04-01T10:00:00Z' },
    { consent_type: 'marketing', consent_value: false, user_id: 'user-a2', created_at: '2026-04-02T10:00:00Z' },
  ],
  [ORG_B]: [
    { consent_type: 'analytics', consent_value: true, user_id: 'user-b1', created_at: '2026-04-01T11:00:00Z' },
  ],
}

const deletionsByOrg: Record<string, unknown[]> = {
  [ORG_A]: [
    { id: 'del-a1', user_id: 'user-a1', requested_at: '2026-04-01T09:00:00Z', scheduled_at: '2026-05-01T09:00:00Z', status: 'pending', cancelled_at: null, completed_at: null },
  ],
  [ORG_B]: [
    { id: 'del-b1', user_id: 'user-b1', requested_at: '2026-04-02T09:00:00Z', scheduled_at: '2026-05-02T09:00:00Z', status: 'pending', cancelled_at: null, completed_at: null },
  ],
}

/**
 * Creates a thenable Supabase-like query chain.
 * Resolves when awaited directly OR when .limit() is called.
 */
function makeChain(table: string) {
  let orgId: string | undefined

  const getData = () => {
    if (table === 'consent_records') {
      queriedOrgByTable['consent_records'] = orgId
      return orgId ? (consentByOrg[orgId] ?? []) : []
    }
    if (table === 'deletion_requests') {
      queriedOrgByTable['deletion_requests'] = orgId
      return orgId ? (deletionsByOrg[orgId] ?? []) : []
    }
    return []
  }

  type ChainResult = { data: unknown[]; error: null }
  type Chain = {
    select: jest.Mock
    eq:     jest.Mock
    gte:    jest.Mock
    order:  jest.Mock
    limit:  jest.Mock
    then:   (resolve: (v: ChainResult) => unknown, reject?: (e: unknown) => unknown) => Promise<unknown>
  }

  const chain: Chain = {
    select: jest.fn(() => chain),
    eq:     jest.fn((col: string, val: string) => { if (col === 'organization_id') orgId = val; return chain }),
    gte:    jest.fn(() => chain),
    order:  jest.fn(() => chain),
    limit:  jest.fn(() => Promise.resolve({ data: getData(), error: null })),
    then:   (resolve, reject) => Promise.resolve({ data: getData(), error: null }).then(resolve, reject),
  }

  return chain
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => makeChain(table)),
  })),
}))

describe('GET /api/admin/compliance — org isolation (AC9)', () => {
  beforeEach(() => {
    queriedOrgByTable['consent_records'] = undefined
    queriedOrgByTable['deletion_requests'] = undefined
    mockAuthResult = { authorized: false }
  })

  it('returns 403 for unauthenticated request', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 403 when admin has no organizationId', async () => {
    mockAuthResult = { authorized: true, organizationId: undefined }
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('filters consent_records by admin org', async () => {
    mockAuthResult = { authorized: true, organizationId: ORG_A }
    await GET()
    expect(queriedOrgByTable['consent_records']).toBe(ORG_A)
  })

  it('filters deletion_requests by admin org', async () => {
    mockAuthResult = { authorized: true, organizationId: ORG_A }
    await GET()
    expect(queriedOrgByTable['deletion_requests']).toBe(ORG_A)
  })

  it('Org A admin does not see Org B users in consent response', async () => {
    mockAuthResult = { authorized: true, organizationId: ORG_A }
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.consent.total).toBe(2)

    const userIds = json.consent.recent.map((r: { user_id: string }) => r.user_id)
    expect(userIds).not.toContain('user-b1')
    expect(userIds).toContain('user-a1')
  })

  it('Org B admin sees only Org B deletion_requests', async () => {
    mockAuthResult = { authorized: true, organizationId: ORG_B }
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(queriedOrgByTable['deletion_requests']).toBe(ORG_B)
    expect(json.deletions.requests).toHaveLength(1)
    expect(json.deletions.requests[0].id).toBe('del-b1')
  })

  it('Org A admin does not see Org B deletion_requests', async () => {
    mockAuthResult = { authorized: true, organizationId: ORG_A }
    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    const ids = json.deletions.requests.map((r: { id: string }) => r.id)
    expect(ids).toContain('del-a1')
    expect(ids).not.toContain('del-b1')
  })
})
