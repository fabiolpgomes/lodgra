/**
 * POST /api/webhooks/asaas — autenticação por token da organização, confirmação da reserva direta
 * por Pix e tratamento de pagamentos atrasados / de valor errado.
 */
jest.mock('server-only', () => ({}))

const mockGetToken = jest.fn()
jest.mock('@/lib/payments/asaas-credentials.server', () => ({
  getAsaasWebhookToken: (...args: unknown[]) => mockGetToken(...args),
}))

const mockConfirm = jest.fn()
jest.mock('@/lib/bookings/confirm-direct-booking.server', () => ({
  confirmDirectBooking: (...args: unknown[]) => mockConfirm(...args),
}))

const mockHasBlocking = jest.fn()
jest.mock('@/lib/bookings/availability-conflict.server', () => ({
  ...jest.requireActual('@/lib/bookings/availability-conflict.server'),
  hasBlockingReservation: (...args: unknown[]) => mockHasBlocking(...args),
}))

let reservationRow: Record<string, unknown> | null
const updates: Array<Record<string, unknown>> = []
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: reservationRow, error: reservationRow ? null : { message: 'nf' } }) }) }),
      update: (values: Record<string, unknown>) => {
        updates.push(values)
        return { eq: async () => ({ error: null }) }
      },
    }),
  }),
}))

import { POST } from '@/app/api/webhooks/asaas/route'

const TOKEN = 'token-da-organizacao'

function webhook(body: unknown, token: string | null = TOKEN) {
  return new Request('http://localhost/api/webhooks/asaas', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'asaas-access-token': token } : {}) },
    body: JSON.stringify(body),
  })
}

const received = (over: Record<string, unknown> = {}) => ({
  event: 'PAYMENT_RECEIVED',
  payment: { id: 'pay_1', externalReference: 'res-1', value: 500, ...over },
})

function directReservation(over: Record<string, unknown> = {}) {
  return {
    organization_id: 'org-1',
    property_id: 'prop-1',
    status: 'pending_payment',
    booking_source: 'direct',
    check_in: '2027-07-10',
    check_out: '2027-07-15',
    total_amount: 500,
    created_at: new Date().toISOString(),
    asaas_payment_id: 'pay_1',
    internal_notes: null,
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  updates.length = 0
  reservationRow = directReservation()
  mockGetToken.mockResolvedValue(TOKEN)
  mockConfirm.mockResolvedValue({ outcome: 'confirmed' })
  mockHasBlocking.mockResolvedValue(false)
})

describe('autenticação', () => {
  it('401 sem o cabeçalho de token', async () => {
    expect((await POST(webhook(received(), null))).status).toBe(401)
  })

  it('401 com token de outra organização', async () => {
    expect((await POST(webhook(received(), 'token-errado'))).status).toBe(401)
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('401 quando a organização ainda não tem token gerado', async () => {
    mockGetToken.mockResolvedValue(null)
    expect((await POST(webhook(received()))).status).toBe(401)
  })

  it('404 para reserva inexistente', async () => {
    reservationRow = null
    expect((await POST(webhook(received()))).status).toBe(404)
  })

  it('não vaza detalhes num erro interno', async () => {
    mockGetToken.mockRejectedValue(new Error('segredo do banco'))
    const res = await POST(webhook(received()))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch(/segredo do banco/)
  })
})

describe('eventos', () => {
  it('ignora eventos que não são de pagamento recebido', async () => {
    const res = await POST(webhook({ event: 'PAYMENT_CREATED', payment: { id: 'pay_1', externalReference: 'res-1' } }))
    expect(res.status).toBe(200)
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('ignora cobrança que não é a da reserva', async () => {
    await POST(webhook(received({ id: 'pay_de_outra' })))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })
})

describe('reserva direta (Pix)', () => {
  it('confirma a reserva pelo caminho comum e aponta o link de confirmação por id', async () => {
    const res = await POST(webhook(received()))
    expect(res.status).toBe(200)
    expect(mockConfirm).toHaveBeenCalledTimes(1)
    const [, reservationId, options] = mockConfirm.mock.calls[0]
    expect(reservationId).toBe('res-1')
    expect(options.paymentFields.asaas_status).toBe('RECEIVED')
    expect(options.bookingUrl('villa-x')).toMatch(/\/p\/villa-x\/booking-confirmed\?reservation_id=res-1$/)
    expect(options.bookingUrl(null)).toBeNull()
  })

  it('PAYMENT_CONFIRMED também confirma', async () => {
    await POST(webhook({ ...received(), event: 'PAYMENT_CONFIRMED' }))
    expect(mockConfirm).toHaveBeenCalledTimes(1)
  })

  it('valor pago menor que o total não confirma e pede devolução', async () => {
    await POST(webhook(received({ value: 100 })))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(String(updates[0].internal_notes)).toMatch(/DEVOLVER PIX/)
  })

  it('entrega repetida de uma reserva já confirmada não faz nada', async () => {
    reservationRow = directReservation({ status: 'confirmed' })
    await POST(webhook(received()))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(updates).toHaveLength(0)
  })

  it('pagamento depois de a reserva ser cancelada exige devolução (uma só vez)', async () => {
    reservationRow = directReservation({ status: 'cancelled' })
    await POST(webhook(received()))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(String(updates[0].internal_notes)).toMatch(/DEVOLVER PIX/)

    updates.length = 0
    reservationRow = directReservation({ status: 'cancelled', internal_notes: 'DEVOLVER PIX: já registado' })
    await POST(webhook(received()))
    expect(updates).toHaveLength(0)
  })

  describe('pagamento fora do prazo', () => {
    const old = () => new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    it('datas ainda livres: confirma mesmo assim', async () => {
      reservationRow = directReservation({ created_at: old() })
      await POST(webhook(received()))
      expect(mockHasBlocking).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        propertyId: 'prop-1', checkIn: '2027-07-10', checkOut: '2027-07-15', excludeReservationId: 'res-1',
      }))
      expect(mockConfirm).toHaveBeenCalledTimes(1)
    })

    it('datas já ocupadas por outra reserva: cancela e pede devolução', async () => {
      reservationRow = directReservation({ created_at: old() })
      mockHasBlocking.mockResolvedValue(true)
      await POST(webhook(received()))
      expect(mockConfirm).not.toHaveBeenCalled()
      expect(updates[0].status).toBe('cancelled')
      expect(String(updates[0].internal_notes)).toMatch(/DEVOLVER PIX/)
    })

    it('dentro do prazo não consulta conflitos', async () => {
      await POST(webhook(received()))
      expect(mockHasBlocking).not.toHaveBeenCalled()
    })
  })
})

describe('cobrança vencida ou removida', () => {
  it.each(['PAYMENT_OVERDUE', 'PAYMENT_DELETED'])('%s cancela a reserva direta que ainda aguardava', async (event) => {
    await POST(webhook({ ...received(), event }))
    expect(updates).toEqual([{ status: 'cancelled' }])
    expect(mockConfirm).not.toHaveBeenCalled()
  })

  it('não mexe numa reserva já confirmada', async () => {
    reservationRow = directReservation({ status: 'confirmed' })
    await POST(webhook({ ...received(), event: 'PAYMENT_OVERDUE' }))
    expect(updates).toHaveLength(0)
  })

  it('não mexe em reserva criada pelo gestor', async () => {
    reservationRow = directReservation({ booking_source: 'manual' })
    await POST(webhook({ ...received(), event: 'PAYMENT_OVERDUE' }))
    expect(updates).toHaveLength(0)
  })

  it('ignora vencimento de cobrança que não é a da reserva', async () => {
    await POST(webhook({ ...received({ id: 'pay_de_outra' }), event: 'PAYMENT_OVERDUE' }))
    expect(updates).toHaveLength(0)
  })
})

describe('reserva criada pelo gestor', () => {
  it('só regista o pagamento, sem confirmar nem enviar e-mails', async () => {
    reservationRow = directReservation({ booking_source: 'manual', status: 'confirmed', internal_notes: 'nota antiga' })
    await POST(webhook(received()))
    expect(mockConfirm).not.toHaveBeenCalled()
    expect(updates[0].asaas_status).toBe('RECEIVED')
    expect(String(updates[0].internal_notes)).toMatch(/nota antiga\nPagamento PIX confirmado/)
  })
})
