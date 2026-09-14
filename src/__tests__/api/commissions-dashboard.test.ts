/** @jest-environment node */
import { GET } from '@/app/api/commissions/dashboard/route'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { startOfMonth, startOfYear } from 'date-fns'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('next/server', () => jest.requireActual('next/server'))

const now = new Date('2026-09-14T12:00:00Z')
const monthBoundary = `${startOfMonth(now).toISOString().slice(0, 10)}T00:00:00Z`
const yearBoundary = `${startOfYear(now).toISOString().slice(0, 10)}T00:00:00Z`
const row = (id: string, status = 'confirmed', amount = 1, date: string | null = monthBoundary) => ({
  id, status, organization_id: 'host-org', property_id: 'property-1' as string | null,
  commission_amount: amount as number | null, commission_calculated_at: date,
  properties: { name: 'Property 1' } as { name: string } | null,
})
let rows: ReturnType<typeof row>[]
let failedPage: number | null
let planError: boolean
const ranges = jest.fn()
const scopes = jest.fn()
const from = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ now })
  failedPage = null
  planError = false
  rows = [
    ...Array.from({ length: 500 }, (_, index) => row(`current-${index}`, ['confirmed', 'completed', 'checked_in'][index % 3])),
    { ...row('previous-year', 'completed', 20, '2025-06-01T00:00:00Z'), property_id: 'property-2', properties: { name: 'Property 2' } },
    row('year-boundary', 'confirmed', 10, yearBoundary),
    { ...row('undated', 'confirmed', 3, null), property_id: null, properties: null },
    row('pending', 'pending', 999), row('payment', 'pending_payment', 999), row('cancelled', 'cancelled', 999),
    { ...row('foreign', 'confirmed', 999), organization_id: 'other-org' },
    { ...row('unknown-commission'), commission_amount: null },
  ]
  ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: 'host-org' })
  from.mockImplementation((table: string) => {
    let selected = [...rows]
    const chain = {
      select: () => chain,
      eq: (field: string, value: unknown) => {
        scopes(table, field, value)
        selected = selected.filter(item => item[field as keyof typeof item] === value)
        return chain
      },
      not: (field: string, operator: string, value: string | null) => {
        if (operator === 'is') selected = selected.filter(item => item[field as keyof typeof item] !== value)
        else if (operator === 'in') {
          const excluded = String(value).slice(1, -1).split(',')
          selected = selected.filter(item => !excluded.includes(String(item[field as keyof typeof item])))
        } else throw new Error(`Unsupported fixture filter ${operator}`)
        return chain
      },
      order: () => { selected.sort((a, b) => a.id.localeCompare(b.id)); return chain },
      range: async (start: number, end: number) => {
        ranges(start, end)
        return failedPage === start ? { data: null, error: { code: 'DB_READ_FAILURE' } }
          : { data: selected.slice(start, end + 1), error: null }
      },
      single: async () => ({ data: { plan: 'premium' }, error: planError ? { code: 'DB_READ_FAILURE' } : null }),
    }
    return chain
  })
  ;(createClient as jest.Mock).mockResolvedValue({ from })
})
afterEach(() => jest.useRealTimers())

it('aggregates both tenant-scoped pages, excludes pending amounts, and preserves date boundaries and legitimate statuses', async () => {
  const response = await GET()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    currentMonth: { total: 500, count: 500, avgPerBooking: 1 },
    yearToDate: { total: 510, count: 501, avgPerBooking: 510 / 501 },
    allTime: { total: 533, count: 503, avgPerBooking: 533 / 503 },
    currentRate: 0.1,
    byProperty: [
      { id: 'property-1', name: 'Property 1', total: 510, count: 501 },
      { id: 'property-2', name: 'Property 2', total: 20, count: 1 },
      { id: null, name: 'Unknown', total: 3, count: 1 },
    ],
  })
  expect(ranges.mock.calls).toEqual([[0, 499], [500, 999]])
  expect(scopes.mock.calls.filter(([table]) => table === 'reservations')).toEqual([
    ['reservations', 'organization_id', 'host-org'], ['reservations', 'organization_id', 'host-org'],
  ])
  expect(from).not.toHaveBeenCalledWith('commission_summary')
})

it.each([0, 500])('returns a database failure instead of zero or partial totals when page %s fails', async (page) => {
  failedPage = page
  const response = await GET()
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({ error: 'Erro ao carregar comissões' })
})

it('returns zero totals for a tenant with no recorded commission', async () => {
  rows = []
  const response = await GET()
  const zero = { total: 0, count: 0, avgPerBooking: 0 }
  expect(await response.json()).toEqual({ currentMonth: zero, yearToDate: zero, allTime: zero, currentRate: 0.1, byProperty: [] })
})

it('fails closed for a missing tenant without consulting commission data', async () => {
  ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true })
  expect((await GET()).status).toBe(403)
  expect(createClient).not.toHaveBeenCalled()
})

it('propagates plan lookup failures rather than silently changing the rate', async () => {
  planError = true
  expect((await GET()).status).toBe(500)
  expect(ranges).not.toHaveBeenCalled()
})
