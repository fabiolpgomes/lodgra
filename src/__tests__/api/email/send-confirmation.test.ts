/**
 * Unit tests for POST /api/email/send-confirmation
 * Covers: reservation lookup, email dispatch, error handling
 */

import { POST } from '@/app/api/email/send-confirmation/route'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingConfirmationToGuest,
  sendBookingNotificationToManager,
} from '@/lib/email/bookingConfirmationGuest'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/email/bookingConfirmationGuest')

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockSendGuest = sendBookingConfirmationToGuest as jest.MockedFunction<typeof sendBookingConfirmationToGuest>
const mockSendManager = sendBookingNotificationToManager as jest.MockedFunction<typeof sendBookingNotificationToManager>

const BASE_URL = 'http://localhost:3000'

function makeConfirmationRequest(body: { reservationId?: string } = {}): NextRequest {
  return new NextRequest(`${BASE_URL}/api/email/send-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockReservation = {
  id: 'res-001',
  confirmation_code: 'CONF123',
  check_in: '2026-06-15',
  check_out: '2026-06-18',
  guest_name: 'Maria Santos',
  guest_email: 'maria@example.com',
  num_guests: 2,
  total_amount: 450.00,
  currency: 'EUR',
  property_listing_id: 'listing-001',
  property_listings: {
    properties: {
      name: 'Apartamento Lisboa',
      city: 'Lisboa',
      slug: 'apartamento-lisboa',
      organization_id: 'org-001',
    },
  },
}

function buildMockSupabase(options: {
  reservationData?: unknown
  reservationError?: unknown
} = {}) {
  const {
    reservationData = mockReservation,
    reservationError = null,
  } = options

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'reservations') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: reservationData,
              error: reservationError,
            }),
          }),
        }),
      }
    }
    return {}
  })

  return { from: mockFrom } as unknown as ReturnType<typeof createAdminClient>
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  mockSendGuest.mockResolvedValue(undefined)
  mockSendManager.mockResolvedValue(undefined)
})

describe('POST /api/email/send-confirmation', () => {
  it('should send confirmation emails successfully with valid reservationId', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toContain('sucesso')
    expect(mockSendGuest).toHaveBeenCalledTimes(1)
    expect(mockSendManager).toHaveBeenCalledTimes(1)

    const guestCall = mockSendGuest.mock.calls[0][0]
    expect(guestCall.guestEmail).toBe('maria@example.com')
    expect(guestCall.propertyName).toBe('Apartamento Lisboa')
  })

  it('should return 400 when reservationId is missing', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())

    const req = makeConfirmationRequest({})
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('obrigatório')
    expect(mockSendGuest).not.toHaveBeenCalled()
  })

  it('should return 404 when reservation not found', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildMockSupabase({
        reservationData: null,
        reservationError: null,
      })
    )

    const req = makeConfirmationRequest({ reservationId: 'nonexistent-id' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toContain('não encontrada')
    expect(mockSendGuest).not.toHaveBeenCalled()
  })

  it('should return 404 when property not found', async () => {
    const reservationWithoutProperty = {
      ...mockReservation,
      property_listings: { properties: null },
    }

    mockCreateAdminClient.mockReturnValue(
      buildMockSupabase({
        reservationData: reservationWithoutProperty,
      })
    )

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toContain('Propriedade')
    expect(mockSendGuest).not.toHaveBeenCalled()
  })

  it('should handle email send failures gracefully', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    mockSendGuest.mockRejectedValue(new Error('Email service error'))

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.details.guestEmail.status).toBe('error')
    expect(json.details.managerEmail.status).toBe('success')
  })

  it('should use fallback values for missing guest data', async () => {
    const reservationWithMissingData = {
      ...mockReservation,
      guest_name: null,
      num_guests: null,
      total_amount: null,
      currency: null,
    }

    mockCreateAdminClient.mockReturnValue(
      buildMockSupabase({ reservationData: reservationWithMissingData })
    )

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const guestCall = mockSendGuest.mock.calls[0][0]
    expect(guestCall.guestName).toBe('Hóspede')
    expect(guestCall.numGuests).toBe(1)
    expect(guestCall.totalAmount).toBe(0)
    expect(guestCall.currency).toBe('EUR')
  })

  it('should handle database query errors', async () => {
    mockCreateAdminClient.mockReturnValue(
      buildMockSupabase({
        reservationData: null,
        reservationError: new Error('Database connection failed'),
      })
    )

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(mockSendGuest).not.toHaveBeenCalled()
  })

  it('should construct correct logo URL from appUrl', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com'
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())

    const req = makeConfirmationRequest({ reservationId: 'res-001' })
    await POST(req)

    const guestCall = mockSendGuest.mock.calls[0][0]
    expect(guestCall.appUrl).toBe('https://custom-domain.com')
  })
})
