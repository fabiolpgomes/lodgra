import { POST } from '../route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { requireRole } from '@/lib/auth/requireRole'
import { ingestGmail } from '@/lib/email-reconciliation/gmail-ingestion'

jest.mock('@/lib/auth/requireRole', () => ({ requireRole: jest.fn() }))
jest.mock('@/lib/email-reconciliation/gmail-ingestion', () => ({ ingestGmail: jest.fn() }))

const ORG = '00000000-0000-0000-0000-000000000001'
const request = () => createTestRequest('https://www.lodgra.io/api/sync/full', { method: 'POST' })
const json = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body })

describe('POST /api/sync/full', () => {
  const fetchBefore = global.fetch
  const secretBefore = process.env.CRON_SECRET
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-secret'
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: ORG })
    ;(ingestGmail as jest.Mock).mockResolvedValue({ staged: 2, errors: 0, connections: 1 })
  })
  afterAll(() => { global.fetch = fetchBefore; process.env.CRON_SECRET = secretBefore })

  it('runs calendars, Gmail and the reconciliation queue for the tenant only', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(json(200, { created: 1, updated: 0, errors: 0 }))
      .mockResolvedValueOnce(json(200, { results: [{ status: 'auto_matched' }, { status: 'rejected' }], replay: { matched: 1 } }))
      .mockResolvedValueOnce(json(200, { results: [], replay: { matched: 0 } })) as jest.Mock

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenNthCalledWith(1, `https://www.lodgra.io/api/cron/sync-ical?manual=true&organization_id=${ORG}`, { headers: { Authorization: 'Bearer cron-secret' } })
    expect(ingestGmail).toHaveBeenCalledWith(ORG)
    expect(body).toMatchObject({ success: true, ical: { ok: true, created: 1 }, email: { ok: true, staged: 2 }, reconciliation: { ok: true, processed: 2, matched: 2 } })
  })

  it('still runs Gmail and the queue when the calendars fail, and reports the partial result', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockResolvedValueOnce(json(200, { results: [], replay: { matched: 0 } })) as jest.Mock

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(207)
    expect(ingestGmail).toHaveBeenCalled()
    expect(body).toMatchObject({ success: false, ical: { ok: false, error: 'ICAL_SYNC_FAILED' }, reconciliation: { ok: true } })
  })

  it('rejects users without an organization', async () => {
    ;(requireRole as jest.Mock).mockResolvedValue({ authorized: true, organizationId: null })
    expect((await POST(request())).status).toBe(403)
  })
})
