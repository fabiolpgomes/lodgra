import 'server-only'
import { asaas } from '@/lib/payments/asaas'
import { getAsaasCredentials, getAsaasWebhookToken } from '@/lib/payments/asaas-credentials.server'
import { getOrganizationTimeZone } from '@/lib/dates/business-timezone.server'
import { todayInTimeZone } from '@/lib/dates/date-only'

export class PixChargeError extends Error {
  constructor(message: string, readonly userMessage = 'Não foi possível gerar o Pix. Tente novamente.') {
    super(message)
  }
}

/**
 * Pix só para propriedades em reais, e só quando o tenant tem o Asaas pronto:
 * chave de API (cria a cobrança) e token do webhook (confirma o pagamento).
 */
export async function canReceivePix(organizationId: string, currency: string | null | undefined): Promise<boolean> {
  if (currency?.toUpperCase() !== 'BRL') return false
  const [credentials, webhookToken] = await Promise.all([
    getAsaasCredentials(organizationId),
    getAsaasWebhookToken(organizationId),
  ])
  return Boolean(credentials && webhookToken)
}

export interface BookingPixCharge {
  paymentId: string
  invoiceUrl: string | null
  status: string | null
  /** Código "copia e cola". */
  payload: string
  /** Imagem do QR Code em base64 (PNG). */
  encodedImage: string
}

export async function createBookingPixCharge(params: {
  organizationId: string
  reservationId: string
  guestName: string
  guestEmail: string
  /** CPF/CNPJ do pagador (só dígitos). Enviado ao Asaas, nunca guardado. */
  guestCpfCnpj: string
  totalAmount: number
  description: string
}): Promise<BookingPixCharge> {
  const credentials = await getAsaasCredentials(params.organizationId)
  if (!credentials) throw new PixChargeError('Asaas não configurado para a organização', 'Este alojamento ainda não aceita Pix.')
  const isProduction = credentials.environment === 'production'

  const customer = await asaas.createCustomer(credentials.apiKey, isProduction, params.guestName, params.guestEmail, params.guestCpfCnpj)
  if (customer?.errors || !customer?.id) {
    throw new PixChargeError(`Asaas createCustomer: ${JSON.stringify(customer?.errors ?? customer)}`)
  }

  const timeZone = await getOrganizationTimeZone(params.organizationId)
  const payment = await asaas.createPayment(credentials.apiKey, isProduction, {
    customer: customer.id,
    billingType: 'PIX',
    value: params.totalAmount,
    dueDate: todayInTimeZone(timeZone),
    description: params.description,
    externalReference: params.reservationId,
  })
  if (payment?.errors || !payment?.id) {
    throw new PixChargeError(`Asaas createPayment: ${JSON.stringify(payment?.errors ?? payment)}`)
  }

  const qr = await asaas.getPixQrCode(credentials.apiKey, isProduction, payment.id)
  if (qr?.errors || !qr?.payload || !qr?.encodedImage) {
    throw new PixChargeError(`Asaas pixQrCode: ${JSON.stringify(qr?.errors ?? 'resposta sem payload')}`)
  }

  return {
    paymentId: payment.id,
    invoiceUrl: payment.invoiceUrl ?? null,
    status: payment.status ?? null,
    payload: qr.payload,
    encodedImage: qr.encodedImage,
  }
}
