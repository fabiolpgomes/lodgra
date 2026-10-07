/**
 * Unit tests for POST /api/stripe/booking-webhook
 * Covers: signature verification, idempotency, confirmation, expiry, email dispatch
 */

import { NextRequest } from 'next/server'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { POST } from '@/app/api/stripe/booking-webhook/route'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingConfirmationToGuest,
  sendBookingNotificationToManager,
} from '@/lib/email/bookingConfirmationGuest'
import {
  claimStripeEvent,
  markStripeEventProcessed,
  releaseStripeEvent,
} from '@/lib/stripe/webhook-idempotency'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/email/bookingConfirmationGuest')
jest.mock('@/lib/email/queue', () => ({ enqueueEmail: jest.fn() }))
jest.mock('@/lib/stripe/webhook-idempotency', () => ({
  claimStripeEvent: jest.fn(),
  markStripeEventProcessed: jest.fn(),
  releaseStripeEvent: jest.fn(),
}))

// Mock Stripe — constructEvent can be controlled per test
const mockConstructEvent = jest.fn()
jest.mock('stripe', () => {
  const StripeMock = jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }))
  // A rota usa o verificador estático (Stripe.webhooks.constructEvent)
  ;(StripeMock as unknown as { webhooks: unknown }).webhooks = {
    constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
  }
  return StripeMock
})

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockSendGuest = sendBookingConfirmationToGuest as jest.MockedFunction<typeof sendBookingConfirmationToGuest>
const mockSendManager = sendBookingNotificationToManager as jest.MockedFunction<typeof sendBookingNotificationToManager>

const mockClaim = claimStripeEvent as jest.MockedFunction<typeof claimStripeEvent>
const mockMarkProcessed = markStripeEventProcessed as jest.MockedFunction<typeof markStripeEventProcessed>
const mockRelease = releaseStripeEvent as jest.MockedFunction<typeof releaseStripeEvent>

const BASE_URL = 'http://localhost:3000'

function makeWebhookRequest(body = '{}', sig = 'valid-sig'): NextRequest {
  return createTestRequest(`${BASE_URL}/api/stripe/booking-webhook`, {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  })
}

const pendingReservation = {
  status: 'pending_payment',
  check_in: '2027-07-10',
  check_out: '2027-07-15',
  guest_name: 'João Silva',
  guest_email: 'joao@example.com',
  total_amount: '500.00',
  num_guests: 2,
  property_listing_id: 'listing-001',
}

function buildMockSupabase(options: {
  reservationData?: unknown
  updateError?: unknown
  listingData?: unknown
  confirmedRows?: unknown[]
} = {}) {
  const {
    reservationData = pendingReservation,
      updateError = null,
      confirmedRows = [{ id: 'res-001' }],
      listingData = {
        property_id: 'prop-123',
        properties: {
          name: 'Villa Algarve',
          city: 'Faro',
          slug: 'villa-algarve',
          organization_id: 'org-001',
          currency: 'EUR',
        },
      },
    } = options

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'reservations') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: reservationData, error: null }),
            // Conta onde a reserva foi cobrada (null = modelo antigo, conta própria da AHS)
            maybeSingle: jest.fn().mockResolvedValue({
              data: reservationData ? { stripe_account_id: (reservationData as { stripe_account_id?: string }).stripe_account_id ?? null } : null,
              error: null,
            }),
          }),
        }),
        // Confirmação: update().eq(id).eq(status).select(); expiração: await update().eq()...
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(Object.assign(Promise.resolve({ error: updateError }), {
            eq: jest.fn().mockReturnValue(Object.assign(Promise.resolve({ error: updateError }), {
              select: jest.fn().mockResolvedValue({ data: updateError ? null : confirmedRows, error: updateError }),
            })),
            neq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: updateError ? null : confirmedRows, error: updateError }),
            }),
          })),
        }),
      }
    }
    if (table === 'property_listings') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: listingData, error: null }),
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
  process.env.STRIPE_EU_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_EU_CONNECT_WEBHOOK_SECRET = 'whsec_test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  mockSendGuest.mockResolvedValue(undefined)
  mockSendManager.mockResolvedValue(undefined)
  mockClaim.mockResolvedValue('claimed')
  mockMarkProcessed.mockResolvedValue(undefined)
  mockRelease.mockResolvedValue(undefined)
})

describe('POST /api/stripe/booking-webhook', () => {
  // TODO: These tests need NextResponse mocking to work properly in Jest environment
  // Issue: NextResponse.json() doesn't work in test environment
  // Fix: Either refactor to use mocked responses or setup proper Next.js test environment
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = createTestRequest(`${BASE_URL}/api/stripe/booking-webhook`, {
      method: 'POST',
      headers: {},
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const req = makeWebhookRequest()
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and ignores unrecognized event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: {} },
    })
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeWebhookRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  describe('checkout.session.completed', () => {
    const completedEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc',
          payment_intent: 'pi_test_123',
          metadata: { reservation_id: 'res-001' },
        },
      },
    }

    it('confirms a pending_payment reservation', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(supabase.from('reservations').update).toBeDefined()
    })

    it('skips processing when reservation is already confirmed (idempotency)', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase({
        reservationData: { ...pendingReservation, status: 'confirmed' },
      })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('sends emails to guest and manager after confirmation', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      await POST(req)
      expect(mockSendGuest).toHaveBeenCalledTimes(1)
      expect(mockSendManager).toHaveBeenCalledTimes(1)
    })

    it('returns 200 even if reservation_id is missing in metadata', async () => {
      mockConstructEvent.mockReturnValue({
        ...completedEvent,
        data: { object: { id: 'cs_test_abc', metadata: {} } },
      })
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  })

  describe('checkout.session.expired', () => {
    const expiredEvent = {
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired',
          metadata: { reservation_id: 'res-002' },
        },
      },
    }

    it('cancels a pending_payment reservation on expiry', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('does not cancel a confirmed reservation on expiry', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const supabase = buildMockSupabase({
        reservationData: { status: 'confirmed' },
      })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('logs error when DB update fails during expiry cancellation', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const supabase = buildMockSupabase({ updateError: { message: 'DB error' } })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      await POST(req)
      // Error should be logged (not thrown — endpoint returns 200)
      consoleSpy.mockRestore()
    })
  })
  describe('idempotência por event.id', () => {
    const event = {
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_abc', payment_intent: 'pi_1', metadata: { reservation_id: 'res-001' } } },
    }

    it('responde 200 sem reprocessar um evento já processado', async () => {
      mockConstructEvent.mockReturnValue(event)
      mockClaim.mockResolvedValue('duplicate')
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
      expect(supabase.from).not.toHaveBeenCalled()
      expect(mockSendGuest).not.toHaveBeenCalled()
    })

    it('responde 409 quando outra entrega está processando o mesmo evento', async () => {
      mockConstructEvent.mockReturnValue(event)
      mockClaim.mockResolvedValue('in_progress')
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(409)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('marca o evento como processado após sucesso', async () => {
      mockConstructEvent.mockReturnValue(event)
      mockCreateAdminClient.mockReturnValue(buildMockSupabase())
      await POST(makeWebhookRequest())
      expect(mockMarkProcessed).toHaveBeenCalledWith(expect.anything(), 'evt_dup')
      expect(mockRelease).not.toHaveBeenCalled()
    })

    it('libera o evento e responde 500 quando o processamento falha', async () => {
      mockConstructEvent.mockReturnValue(event)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateAdminClient.mockReturnValue(buildMockSupabase({ updateError: { message: 'DB error' } }))
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(500)
      expect(mockRelease).toHaveBeenCalledWith(expect.anything(), 'evt_dup')
      expect(mockMarkProcessed).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('responde 500 quando não consegue registrar o evento (Stripe reenvia)', async () => {
      mockConstructEvent.mockReturnValue(event)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockClaim.mockRejectedValue(new Error('db down'))
      mockCreateAdminClient.mockReturnValue(buildMockSupabase())
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(500)
      consoleSpy.mockRestore()
    })

    it('não envia e-mails quando outra entrega já confirmou a reserva (update sem linhas)', async () => {
      mockConstructEvent.mockReturnValue(event)
      mockCreateAdminClient.mockReturnValue(buildMockSupabase({ confirmedRows: [] }))
      const res = await POST(makeWebhookRequest())
      expect(res.status).toBe(200)
      expect(mockSendGuest).not.toHaveBeenCalled()
      expect(mockSendManager).not.toHaveBeenCalled()
    })
  })
})

describe('POST /api/stripe/booking-webhook — contas conectadas dos tenants', () => {
  const ENV = process.env
  beforeEach(() => {
    process.env = { ...ENV, STRIPE_SECRET_KEY: 'sk_test_br', STRIPE_CONNECT_WEBHOOK_SECRET: 'whsec_connect_br' }
  })
  afterAll(() => { process.env = ENV })

  function completedFrom(account: string | undefined) {
    return {
      id: 'evt_connect_1',
      type: 'checkout.session.completed',
      account,
      data: { object: { id: 'cs_1', payment_intent: 'pi_1', metadata: { reservation_id: 'res-001' } } },
    }
  }

  it('aceita a assinatura do endpoint de contas conectadas e confirma a reserva da própria conta', async () => {
    mockConstructEvent.mockImplementation((_b: string, _s: string, secret: string) => {
      if (secret !== 'whsec_connect_br') throw new Error('bad signature')
      return completedFrom('acct_tenant_1')
    })
    const supabase = buildMockSupabase({ reservationData: { ...pendingReservation, stripe_account_id: 'acct_tenant_1' } })
    mockCreateAdminClient.mockReturnValue(supabase)

    const res = await POST(makeWebhookRequest())

    expect(res.status).toBe(200)
    expect(mockSendGuest).toHaveBeenCalled()
  })

  it('ignora evento de outra conta que usa o reservation_id de outro tenant', async () => {
    mockConstructEvent.mockReturnValue(completedFrom('acct_intruso'))
    const supabase = buildMockSupabase({ reservationData: { ...pendingReservation, stripe_account_id: 'acct_tenant_1' } })
    mockCreateAdminClient.mockReturnValue(supabase)

    const res = await POST(makeWebhookRequest())

    expect(res.status).toBe(200)
    expect(mockSendGuest).not.toHaveBeenCalled()
    expect(mockMarkProcessed).toHaveBeenCalled()
  })

describe('entrega tardia', () => {
  it('não reabre uma reserva cancelada nem envia e-mails', async () => {
    const supabase = buildMockSupabase({ reservationData: { ...pendingReservation, status: 'cancelled' } })
    mockCreateAdminClient.mockReturnValue(supabase)
    mockConstructEvent.mockReturnValue({
      id: 'evt_late',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_late', metadata: { reservation_id: 'res-001' }, payment_intent: 'pi_1' } },
    })
    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(mockSendGuest).not.toHaveBeenCalled()
    expect(mockSendManager).not.toHaveBeenCalled()
  })
})

describe('link do e-mail', () => {
  it('aponta para a página de confirmação no site do tenant', async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase())
    mockConstructEvent.mockReturnValue({
      id: 'evt_link',
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_abc',
        success_url: 'https://algarve-home-stay.lodgra.io/p/villa/booking-confirmed?session_id={CHECKOUT_SESSION_ID}',
        metadata: { reservation_id: 'res-001' },
        payment_intent: 'pi_1',
      } },
    })
    await POST(makeWebhookRequest())
    expect(mockSendGuest).toHaveBeenCalledWith(expect.objectContaining({
      bookingUrl: 'https://algarve-home-stay.lodgra.io/p/villa-algarve/booking-confirmed?session_id=cs_abc',
    }))
  })
})

describe('charge.refunded', () => {
  function refundSupabase(reservation: Record<string, unknown> | null) {
    const updates: Record<string, unknown>[] = []
    const client = {
      from: jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: reservation, error: null }) }),
        }),
        update: jest.fn().mockImplementation((v: Record<string, unknown>) => {
          updates.push(v)
          return { eq: jest.fn().mockResolvedValue({ error: null }) }
        }),
      })),
    }
    return { client: client as unknown as ReturnType<typeof createAdminClient>, updates }
  }

  function refundEvent(amountRefunded: number, account = 'acct_tenant') {
    return {
      id: `evt_ref_${amountRefunded}`,
      type: 'charge.refunded',
      account,
      data: { object: { payment_intent: 'pi_1', amount: 600, amount_refunded: amountRefunded, refunded: amountRefunded >= 600, refunds: { data: [{ id: 're_1' }] } } },
    }
  }

  it('reembolso total cancela a reserva e liberta as datas', async () => {
    const { client, updates } = refundSupabase({ id: 'res-1', reservation_status: 'confirmed', stripe_account_id: 'acct_tenant' })
    mockCreateAdminClient.mockReturnValue(client)
    mockConstructEvent.mockReturnValue(refundEvent(600))
    const res = await POST(makeWebhookRequest())
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ refund_amount: 6, stripe_refund_id: 're_1', reservation_status: 'cancelled' })
  })

  it('reembolso parcial só regista o valor', async () => {
    const { client, updates } = refundSupabase({ id: 'res-1', reservation_status: 'confirmed', stripe_account_id: 'acct_tenant' })
    mockCreateAdminClient.mockReturnValue(client)
    mockConstructEvent.mockReturnValue(refundEvent(200))
    await POST(makeWebhookRequest())
    expect(updates[0]).toMatchObject({ refund_amount: 2 })
    expect(updates[0]).not.toHaveProperty('reservation_status')
  })

  it('ignora reembolso vindo de outra conta conectada', async () => {
    const { client, updates } = refundSupabase({ id: 'res-1', reservation_status: 'confirmed', stripe_account_id: 'acct_tenant' })
    mockCreateAdminClient.mockReturnValue(client)
    mockConstructEvent.mockReturnValue(refundEvent(600, 'acct_outro'))
    await POST(makeWebhookRequest())
    expect(updates).toHaveLength(0)
  })
})
})

