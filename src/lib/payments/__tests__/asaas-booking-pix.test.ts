jest.mock('server-only', () => ({}))

const mockGetCredentials = jest.fn()
const mockGetWebhookToken = jest.fn()
jest.mock('@/lib/payments/asaas-credentials.server', () => ({
  getAsaasCredentials: (...args: unknown[]) => mockGetCredentials(...args),
  getAsaasWebhookToken: (...args: unknown[]) => mockGetWebhookToken(...args),
}))
jest.mock('@/lib/dates/business-timezone.server', () => ({
  getOrganizationTimeZone: jest.fn().mockResolvedValue('America/Sao_Paulo'),
}))

const mockCreateCustomer = jest.fn()
const mockCreatePayment = jest.fn()
const mockGetQr = jest.fn()
const mockDeletePayment = jest.fn()
jest.mock('@/lib/payments/asaas', () => ({
  asaas: {
    createCustomer: (...args: unknown[]) => mockCreateCustomer(...args),
    createPayment: (...args: unknown[]) => mockCreatePayment(...args),
    getPixQrCode: (...args: unknown[]) => mockGetQr(...args),
    deletePayment: (...args: unknown[]) => mockDeletePayment(...args),
  },
}))

import { canReceivePix, createBookingPixCharge, PixChargeError } from '../asaas-booking-pix.server'

const credentials = { apiKey: 'key-sandbox', environment: 'sandbox' as const }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCredentials.mockResolvedValue(credentials)
  mockGetWebhookToken.mockResolvedValue('tok')
})

describe('canReceivePix', () => {
  it('sim: BRL com chave e token', async () => {
    expect(await canReceivePix('org-1', 'BRL')).toBe(true)
    expect(await canReceivePix('org-1', 'brl')).toBe(true)
  })

  it.each(['EUR', 'USD', null, undefined, ''])('não para moeda %p', async (currency) => {
    expect(await canReceivePix('org-1', currency as string | null | undefined)).toBe(false)
  })

  it('não sem chave de API', async () => {
    mockGetCredentials.mockResolvedValue(null)
    expect(await canReceivePix('org-1', 'BRL')).toBe(false)
  })

  it('não sem token de webhook (não haveria como confirmar o pagamento)', async () => {
    mockGetWebhookToken.mockResolvedValue(null)
    expect(await canReceivePix('org-1', 'BRL')).toBe(false)
  })
})

describe('createBookingPixCharge', () => {
  const params = {
    organizationId: 'org-1',
    reservationId: 'res-1',
    guestName: 'João Silva',
    guestEmail: 'joao@example.com',
    guestCpfCnpj: '52998224725',
    totalAmount: 500,
    description: 'Villa — 5 noites',
  }

  beforeEach(() => {
    mockCreateCustomer.mockResolvedValue({ id: 'cus_1' })
    mockCreatePayment.mockResolvedValue({ id: 'pay_1', invoiceUrl: 'https://inv', status: 'PENDING' })
    mockGetQr.mockResolvedValue({ payload: 'PIXCODE', encodedImage: 'base64png' })
    mockDeletePayment.mockResolvedValue({ deleted: true })
  })

  it('cria cliente, cobrança Pix ligada à reserva e devolve o QR', async () => {
    const charge = await createBookingPixCharge(params)
    expect(mockCreateCustomer).toHaveBeenCalledWith('key-sandbox', false, 'João Silva', 'joao@example.com', '52998224725')
    expect(mockCreatePayment).toHaveBeenCalledWith('key-sandbox', false, expect.objectContaining({
      customer: 'cus_1',
      billingType: 'PIX',
      value: 500,
      externalReference: 'res-1',
      dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }))
    expect(charge).toEqual({ paymentId: 'pay_1', invoiceUrl: 'https://inv', status: 'PENDING', payload: 'PIXCODE', encodedImage: 'base64png' })
  })

  it('usa o ambiente de produção quando configurado', async () => {
    mockGetCredentials.mockResolvedValue({ apiKey: 'k', environment: 'production' })
    await createBookingPixCharge(params)
    expect(mockCreatePayment).toHaveBeenCalledWith('k', true, expect.anything())
  })

  it('sem Asaas configurado → PixChargeError', async () => {
    mockGetCredentials.mockResolvedValue(null)
    await expect(createBookingPixCharge(params)).rejects.toBeInstanceOf(PixChargeError)
  })

  it.each([
    ['cliente', () => mockCreateCustomer.mockResolvedValue({ errors: [{ description: 'x' }] })],
    ['cobrança', () => mockCreatePayment.mockResolvedValue({ errors: [{ description: 'y' }] })],
    ['QR Code', () => mockGetQr.mockResolvedValue({ errors: [{ description: 'z' }] })],
  ])('erro do Asaas ao criar %s → PixChargeError com mensagem genérica ao hóspede', async (_name, setup) => {
    ;(setup as () => void)()
    const error = await createBookingPixCharge(params).catch((e) => e)
    expect(error).toBeInstanceOf(PixChargeError)
    expect(error.userMessage).not.toMatch(/Asaas|errors|description/)
  })

  it('QR Code com erro (ex.: sem chave Pix) → cancela a cobrança criada', async () => {
    mockGetQr.mockResolvedValue({ errors: [{ code: 'invalid_action' }] })
    await expect(createBookingPixCharge(params)).rejects.toBeInstanceOf(PixChargeError)
    expect(mockDeletePayment).toHaveBeenCalledWith('key-sandbox', false, 'pay_1')
  })

  it('QR Code lança exceção (timeout) → cancela a cobrança e propaga o erro', async () => {
    mockGetQr.mockRejectedValue(new Error('timeout'))
    await expect(createBookingPixCharge(params)).rejects.toThrow('timeout')
    expect(mockDeletePayment).toHaveBeenCalledWith('key-sandbox', false, 'pay_1')
  })

  it('falha ao cancelar a cobrança não esconde o erro original', async () => {
    mockGetQr.mockResolvedValue({ errors: [{ code: 'x' }] })
    mockDeletePayment.mockRejectedValue(new Error('rede'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const error = await createBookingPixCharge(params).catch((e) => e)
    expect(error).toBeInstanceOf(PixChargeError)
    expect(error.message).toMatch(/pixQrCode/)
  })

  it('sucesso não cancela nada', async () => {
    await createBookingPixCharge(params)
    expect(mockDeletePayment).not.toHaveBeenCalled()
  })
})
