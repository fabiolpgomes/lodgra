import { GET } from '../route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { ingestGmail } from '@/lib/email-reconciliation/gmail-ingestion'

jest.mock('@/lib/email-reconciliation/gmail-ingestion', () => ({ ingestGmail: jest.fn() }))

describe('Gmail ingestion cron', () => {
  const secret = process.env.CRON_SECRET
  beforeEach(() => { jest.clearAllMocks(); process.env.CRON_SECRET = 'cron-test' })
  afterAll(() => { if (secret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = secret })
  it('rejects requests before accessing Gmail', async () => {
    expect((await GET(createTestRequest('http://localhost/api/cron/email-parser'))).status).toBe(401)
    expect(ingestGmail).not.toHaveBeenCalled()
  })
  it('ingests without the retired Anthropic writer', async () => {
    ;(ingestGmail as jest.Mock).mockResolvedValue({ processed: 2, staged: 2, errors: 0 })
    const response = await GET(createTestRequest('http://localhost/api/cron/email-parser', { headers: { authorization: 'Bearer cron-test' } }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ staged: 2, success: true })
  })
  it('reports ingestion failures as failed HTTP execution', async () => {
    ;(ingestGmail as jest.Mock).mockResolvedValue({ processed: 0, staged: 0, errors: 1 })
    expect((await GET(createTestRequest('http://localhost/api/cron/email-parser', { headers: { authorization: 'Bearer cron-test' } }))).status).toBe(503)
  })
})
