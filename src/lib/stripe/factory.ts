import { stripeBR } from './client-br'
import { stripePT } from './client-pt'

export type PaymentType = 'subscription' | 'booking'

export function getStripeClient(paymentType: PaymentType) {
  if (paymentType === 'subscription') {
    return stripeBR
  }
  return stripePT
}
