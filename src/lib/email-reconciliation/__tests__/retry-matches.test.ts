import { createAdminClient } from '@/lib/supabase/admin'
import { syncExtractedDataToReservation } from '../sync-to-reservations'
import { retryUnmatchedExtractions } from '../retry-matches'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('../sync-to-reservations', () => ({ syncExtractedDataToReservation: jest.fn() }))

function query(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'gte', 'or', 'order', 'limit']) q[method] = jest.fn(() => q)
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return q
}

describe('retryUnmatchedExtractions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('resolves enabled organizations without embedding them in email_extractions', async () => {
    const orgs = query({ data: [{ id: 'org-1' }], error: null })
    const extractions = query({ data: [{ id: 'ext-1' }, { id: 'ext-2' }], error: null })
    const from = jest.fn((table: string) => (table === 'organizations' ? orgs : extractions))
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })
    ;(syncExtractedDataToReservation as jest.Mock)
      .mockResolvedValueOnce({ success: true, status: 'auto_matched' })
      .mockResolvedValueOnce({ success: false, status: 'no_match' })

    await expect(retryUnmatchedExtractions()).resolves.toEqual({ retried: 2, matched: 1, errors: 1 })
    expect(extractions.select).toHaveBeenCalledWith('id')
    expect(extractions.in).toHaveBeenCalledWith('organization_id', ['org-1'])
    expect(extractions.or).toHaveBeenCalledWith(expect.stringContaining('and(check_out.is.null,source_platform.eq.booking'))
  })

  it('skips the extraction lookup when no organization is enabled', async () => {
    const orgs = query({ data: [], error: null })
    const from = jest.fn(() => orgs)
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })

    await expect(retryUnmatchedExtractions()).resolves.toEqual({ retried: 0, matched: 0, errors: 0 })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('reports lookup failures with a stable code', async () => {
    const orgs = query({ data: null, error: { message: 'boom' } })
    ;(createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn(() => orgs) })

    await expect(retryUnmatchedExtractions()).rejects.toThrow('MATCH_RETRY_LOOKUP_FAILED')
  })
})
