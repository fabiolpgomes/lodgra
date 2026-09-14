import { findMatchingICalReservation } from '@/lib/email-parser/reservationMatcher'
import { GET } from '@/app/api/cron/email-parser/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { fetchUnreadEmails } from '@/lib/email-parser/gmail-client'
import { parseReservationEmail } from '@/lib/email-parser/parser'
import { sendOwnerReservationNotification } from '@/lib/email/resend'

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/email-reconciliation/feature-flag', () => ({ isEmailICalEnabled: jest.fn().mockResolvedValue(false) }))
jest.mock('@/lib/email-parser/gmail-client', () => ({
  getValidAccessToken: jest.fn().mockResolvedValue('fixture-token'), fetchUnreadEmails: jest.fn(),
}))
jest.mock('@/lib/email-parser/platforms', () => ({ detectPlatform: jest.fn(() => 'booking'), ALL_KNOWN_SENDERS: [] }))
jest.mock('@/lib/email-parser/parser', () => ({ parseReservationEmail: jest.fn() }))
jest.mock('@/lib/email/resend', () => ({ sendOwnerReservationNotification: jest.fn() }))
jest.mock('@/lib/email-parser/propertyDetector', () => ({
  detectPropertyFromEmailDomain: jest.fn().mockResolvedValue('property-1'),
  getDefaultPropertyIfSingleOwner: jest.fn(), extractDatesFromEmailBody: jest.fn(() => ({})),
}))
jest.mock('@/lib/email-parser/cancellationDetector', () => ({ isCancellationEmail: jest.fn(() => false) }))
jest.mock('@/lib/email-parser/reservationMatcher', () => ({
  ...jest.requireActual('@/lib/email-parser/reservationMatcher'),
  findMatchingICalReservation: jest.fn().mockResolvedValue('reservation-1'),
}))

function query(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'not']) chain[method] = jest.fn(() => chain)
  chain.single = jest.fn(() => Promise.resolve(result))
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

describe('legacy Gmail matched reservation preserves manual fields', () => {
  const originalSecret = process.env.CRON_SECRET
  const originalKey = process.env.ANTHROPIC_API_KEY
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'cron-test-secret'
    process.env.ANTHROPIC_API_KEY = 'fixture-key'
  })
  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalSecret
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = originalKey
  })

  it.each(['success', 'write-error', 'lookup-error'])('preserves fields and never creates a duplicate on %s through the real helper', async (mode) => {
    if (mode === 'lookup-error') {
      ;(findMatchingICalReservation as jest.Mock).mockImplementationOnce(jest.requireActual('@/lib/email-parser/reservationMatcher').findMatchingICalReservation)
    }
    ;(fetchUnreadEmails as jest.Mock).mockResolvedValue([{
      id: 'email-1', from: 'booking@example.com', subject: 'Confirmed', body: 'fixture', receivedAt: new Date(),
    }])
    ;(parseReservationEmail as jest.Mock).mockResolvedValue({
      guest_name: 'Different Imported Guest', checkin_date: '2026-09-20', checkout_date: '2026-09-22',
      confirmation_code: 'fixture-reference', platform: 'booking', amount: 900, currency: 'USD', num_guests: 9,
    })
    const updates: Record<string, unknown>[] = []
    const reservationInsert = jest.fn()
    const logInsert = jest.fn(() => query({ data: null, error: null }))
    const from = jest.fn((table: string) => {
      if (table === 'email_connections') return {
        ...query({ data: [{ id: 'connection-1', organization_id: 'org-1', email: 'host@example.com' }], error: null }),
        update: jest.fn(() => query({ data: null, error: null })),
      }
      if (table === 'email_parse_log') return {
        ...query({ data: null, error: null }), insert: logInsert,
      }
      if (table === 'reservations') return {
        select: jest.fn(() => query({ data: null, error: { message: 'Database read refused' } })),
        update: jest.fn((payload: Record<string, unknown>) => {
          updates.push(payload)
          return query({ data: null, error: mode === 'write-error' ? { message: 'Database write refused' } : null })
        }),
        insert: reservationInsert,
      }
      throw new Error(`Unexpected table ${table}`)
    })
    ;(createAdminClient as jest.Mock).mockReturnValue({ from })
    const response = await GET(createTestRequest('http://localhost/api/cron/email-parser', {
      headers: { authorization: 'Bearer cron-test-secret' },
    }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ processed: 1, errors: mode === 'success' ? 0 : 1 })
    expect(updates).toEqual(mode === 'lookup-error' ? [] : [{
      updated_at: expect.any(String), platform_synced_at: expect.any(String),
      booking_reference: 'fixture-reference', booking_source: 'booking',
    }])
    expect(reservationInsert).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalledWith('property_listings')
    if (mode === 'lookup-error') expect(body.errorDetails).toEqual([expect.objectContaining({ message: expect.stringContaining('Database read refused') })])
    if (mode === 'write-error') {
      expect(logInsert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error', matched_reservation_id: 'reservation-1',
        error_message: 'Falha ao atualizar metadata da reserva existente',
      }))
    }
    expect(sendOwnerReservationNotification).not.toHaveBeenCalled()
  })
})
