import { POST } from '../route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractEmailData } from '@/lib/email-reconciliation/extract-service'
import { isPlatformInPilot } from '@/lib/email-reconciliation/feature-flag'
import { syncExtractedDataToReservation } from '@/lib/email-reconciliation/sync-to-reservations'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/email-reconciliation/extract-service', () => ({ extractEmailData: jest.fn() }))
jest.mock('@/lib/email-reconciliation/feature-flag', () => ({ isPlatformInPilot: jest.fn() }))
jest.mock('@/lib/email-reconciliation/sync-to-reservations', () => ({ syncExtractedDataToReservation: jest.fn() }))

const secret = 'email-cron-secret'

function updateQuery() {
  const query: Record<string, unknown> = {
    eq: jest.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
  }
  return query
}

describe('POST /api/email-extraction/process-pending', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = secret
    ;(isPlatformInPilot as jest.Mock).mockResolvedValue(true)
  })

  afterAll(() => { process.env.CRON_SECRET = originalSecret })

  it('rejects unauthenticated execution before claiming PII', async () => {
    const response = await POST(createTestRequest('http://localhost/api/email-extraction/process-pending', { method: 'POST' }))
    expect(response.status).toBe(401)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it.each(['auto_matched', 'needs_review', 'no_match'])('persists extraction and handles reconciliation status %s', async (status) => {
    const raw = {
      id: 'raw-1', organization_id: 'org-1', sender: 'noreply@booking.com',
      raw_content: 'Booking reservation', attempt_count: 1,
    }
    const rpc = jest.fn().mockResolvedValue({ data: [raw], error: null })
    const upsertQuery = {
      select: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: { id: 'ext-1' }, error: null }) })),
    }
    const update = jest.fn(() => updateQuery())
    const from = jest.fn((table: string) => {
      if (table === 'email_extractions') return { upsert: jest.fn(() => upsertQuery) }
      if (table === 'raw_emails') return { update }
      throw new Error(`Unexpected table ${table}`)
    })
    ;(createAdminClient as jest.Mock).mockReturnValue({ rpc, from })
    ;(extractEmailData as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        guest_name: 'Nuno Correia', check_in: '2026-09-29', check_out: '2026-09-30',
        total_value: 162.09, currency: 'EUR', source_platform: 'booking',
        property_identifier_raw: 'AHS Premium Apart', reservation_code: '5762083928',
        guest_count: 3, confidence: 0.98,
      },
      confidence: 0.98, model: 'gpt-4.1-mini', version: 'email-reservation-extraction/v1', truncated: false,
    })
    ;(syncExtractedDataToReservation as jest.Mock).mockResolvedValue({
      success: true, status, reservationId: status === 'auto_matched' ? 'reservation-1' : undefined,
    })

    const response = await POST(createTestRequest('http://localhost/api/email-extraction/process-pending', {
      method: 'POST', headers: { authorization: `Bearer ${secret}` },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results[0]).toMatchObject({ success: true, status })
    if (status === 'auto_matched') {
      expect(body.results[0].reservationId).toBe('reservation-1')
      expect(update).not.toHaveBeenCalled()
    } else {
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        processing_status: status === 'needs_review' ? 'needs_review' : 'processed',
      }))
    }
    expect(syncExtractedDataToReservation).toHaveBeenCalledWith('ext-1')
  })

  it('retries once and then stops automatic processing', async () => {
    const raw = {
      id: 'raw-2', organization_id: 'org-1', sender: 'noreply@booking.com',
      raw_content: 'invalid', attempt_count: 2,
    }
    const update = jest.fn(() => updateQuery())
    ;(createAdminClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: [raw], error: null }),
      from: jest.fn(() => ({ update })),
    })
    ;(extractEmailData as jest.Mock).mockResolvedValue({
      success: false, error: 'invalid structured output', confidence: 0,
      version: 'email-reservation-extraction/v1', truncated: false,
    })

    const response = await POST(createTestRequest('http://localhost/api/email-extraction/process-pending', {
      method: 'POST', headers: { authorization: `Bearer ${secret}` },
    }))
    const body = await response.json()
    expect(body.results[0].status).toBe('needs_review')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ processing_status: 'needs_review' }))
    expect(syncExtractedDataToReservation).not.toHaveBeenCalled()
  })
})
