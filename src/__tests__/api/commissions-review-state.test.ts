/** @jest-environment node */
import { GET as history } from '@/app/api/commissions/history/route'
import { GET as exportCSV } from '@/app/api/commissions/export/route'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('next/server', () => jest.requireActual('next/server'))

const rows = ['pending', 'pending_payment', 'cancelled', 'confirmed', 'completed', 'checked_in'].map(status => ({
  id: status, status, organization_id: 'host-org', guest_name: `Guest ${status}`,
  check_in: '2026-09-16', check_out: '2026-09-20', total_amount: 360.72,
  commission_amount: 59.16, commission_rate: 0.164,
  commission_calculated_at: '2026-09-14T10:00:00Z',
  properties: { id: 'property', name: 'Test property' },
}))
const data = [...rows, { ...rows[3], id: 'other-tenant', organization_id: 'other-org' }]

// Apply the requested filters to a mixed fixture, so assertions exercise the
// response population and pagination rather than just the fluent method names.
function query() {
  let selected = [...data]
  let head = false
  const chain = {
    select: (_columns: string, options?: { head?: boolean }) => { head = Boolean(options?.head); return chain },
    eq: (column: string, value: unknown) => {
      selected = selected.filter(row => row[column as keyof typeof row] === value); return chain
    },
    neq: (column: string, value: unknown) => {
      selected = selected.filter(row => row[column as keyof typeof row] !== value); return chain
    },
    not: (column: string, operator: string, value: string | null) => {
      if (operator === 'is') selected = selected.filter(row => row[column as keyof typeof row] !== value)
      else if (operator === 'in') {
        const excluded = String(value).slice(1, -1).split(',')
        selected = selected.filter(row => !excluded.includes(String(row[column as keyof typeof row])))
      } else throw new Error(`Unsupported fixture filter ${operator}`)
      return chain
    },
    order: () => chain,
    range: (from: number, to: number) => { selected = selected.slice(from, to + 1); return chain },
    then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({
      data: head ? null : selected, count: selected.length, error: null,
    })),
  }
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'host-org' })
  ;(createClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => query()) })
})

it('excludes unreviewed reservations with real amounts from history and its pagination count', async () => {
  const response = await history(createTestRequest('http://localhost/api/commissions/history?limit=2'))
  expect(response.status).toBe(200)
  const body = await response.json()
  expect(body.data.map((row: { id: string }) => row.id)).toEqual(['confirmed', 'completed'])
  expect(body.pagination).toEqual({ page: 1, limit: 2, total: 3, pages: 2 })
  const second = await history(createTestRequest('http://localhost/api/commissions/history?limit=2&page=2'))
  expect((await second.json()).data.map((row: { id: string }) => row.id)).toEqual(['checked_in'])
})

it('exports only reviewed lifecycle states and preserves their financial values', async () => {
  const response = await exportCSV(createTestRequest('http://localhost/api/commissions/export'))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('text/csv')
  const lines = (await response.text()).split('\n')
  expect(lines).toHaveLength(4)
  expect(lines.slice(1).map(line => line.split(',')[0])).toEqual(['confirmed', 'completed', 'checked_in'])
  for (const line of lines.slice(1)) expect(line).toContain(',360.72,16.4%,59.16,')
})
