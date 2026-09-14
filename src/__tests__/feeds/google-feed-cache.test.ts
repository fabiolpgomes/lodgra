/** @jest-environment node */
import { GET, HEAD } from '@/app/api/feeds/google-vacation-rentals/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { aggregatePropertyReviews } from '@/lib/feeds/review-aggregator'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/feeds/review-aggregator')
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }))
jest.mock('next/server', () => jest.requireActual('next/server'))

const endpoint = 'http://localhost/api/feeds/google-vacation-rentals?currency=EUR'
let tables: Record<string, unknown>

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-14T10:00:00Z') })
  tables = {
    properties: [{ id: 'property', name: 'Test Property', slug: 'test-property', updated_at: '2026-09-01T00:00:00Z' }],
    property_images: [], property_reviews: { rating: 4, review_count: 1 },
    reservations: [], property_amenities: [],
  }
  ;(aggregatePropertyReviews as jest.Mock).mockResolvedValue(null)
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: (table: string) => {
    const result = { data: tables[table] ?? [], error: null }
    const query = {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(), range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue(result),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(resolve(result)),
    }
    return query
  } })
})

afterEach(() => jest.useRealTimers())

it.each(['weak', 'strong', 'list', 'wildcard'])('revalidates unchanged data across clocks with a %s validator', async (mode) => {
  const first = await GET(createTestRequest(endpoint))
  expect(first.status).toBe(200)
  const etag = first.headers.get('etag')!
  expect(etag).toMatch(/^W\/"[a-f0-9]{32}"$/)
  jest.setSystemTime(new Date('2026-09-14T12:00:00Z'))
  const validators = { weak: etag, strong: etag.slice(2), list: `"other", ${etag}`, wildcard: '*' }
  const response = await GET(createTestRequest(endpoint, {
    headers: { 'if-none-match': validators[mode as keyof typeof validators] },
  }))
  expect(response.status).toBe(304)
  expect(response.headers.get('etag')).toBe(etag)
  expect(response.headers.get('cache-control')).toBe(first.headers.get('cache-control'))
  expect(await response.text()).toBe('')
})

it('revalidates legacy properties without a stored update timestamp across clocks', async () => {
  tables.properties = [{ id: 'property', name: 'Test Property', slug: 'test-property', updated_at: null }]
  const first = await GET(createTestRequest(endpoint))
  expect(first.status).toBe(200)
  const etag = first.headers.get('etag')!
  jest.setSystemTime(new Date('2026-09-14T12:00:00Z'))
  const response = await GET(createTestRequest(endpoint, { headers: { 'if-none-match': etag } }))
  expect(response.status).toBe(304)
})

it('keeps the validator stable when the database returns the same availability in another order', async () => {
  const ranges = [
    { check_in: '2026-10-01', check_out: '2026-10-03' },
    { check_in: '2026-11-01', check_out: '2026-11-03' },
  ]
  tables.reservations = ranges
  const first = await GET(createTestRequest(endpoint))
  expect(first.status).toBe(200)
  tables.reservations = [...ranges].reverse()
  const response = await GET(createTestRequest(endpoint, {
    headers: { 'if-none-match': first.headers.get('etag')! },
  }))
  expect(response.status).toBe(304)
})

it.each(['property', 'availability', 'review', 'review text', 'stored timestamp'])('invalidates the ETag when %s content changes', async (field) => {
  const first = await GET(createTestRequest(endpoint))
  const etag = first.headers.get('etag')!
  if (field === 'property') tables.properties = [{ id: 'property', name: 'Renamed Property', slug: 'test-property', updated_at: '2026-09-01T00:00:00Z' }]
  if (field === 'availability') tables.reservations = [{ check_in: '2026-10-01', check_out: '2026-10-03' }]
  if (field === 'review') tables.property_reviews = { rating: 5, review_count: 2 }
  if (field === 'review text') (aggregatePropertyReviews as jest.Mock).mockResolvedValue({
    reviews: [{ rating: 5, source: 'booking', text: 'A new review', author: 'Guest', date: '2026-09-14' }],
    aggregateRating: { average: 5, count: 1, bestRating: 5, worstRating: 1 },
  })
  if (field === 'stored timestamp') tables.properties = [{ id: 'property', name: 'Test Property', slug: 'test-property', updated_at: '2026-09-14T10:00:00Z' }]
  const response = await GET(createTestRequest(endpoint, { headers: { 'if-none-match': etag } }))
  expect(response.status).toBe(200)
  expect(response.headers.get('etag')).not.toBe(etag)
})

it('uses the same validator and conditional response for HEAD', async () => {
  const first = await GET(createTestRequest(endpoint))
  const etag = first.headers.get('etag')!
  jest.setSystemTime(new Date('2026-09-14T12:00:00Z'))
  const response = await HEAD(createTestRequest(endpoint, { method: 'HEAD' }))
  expect(response.status).toBe(200)
  expect(response.headers.get('etag')).toBe(etag)
  expect(await response.text()).toBe('')
  const cached = await HEAD(createTestRequest(endpoint, { method: 'HEAD', headers: { 'if-none-match': etag } }))
  expect(cached.status).toBe(304)
  expect(await cached.text()).toBe('')
})
