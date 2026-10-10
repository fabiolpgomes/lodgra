export interface AsaasPaymentRequest {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}

const REQUEST_TIMEOUT_MS = 15_000

// O Asaas exige User-Agent nas contas novas e responde 403 sem ele.
const USER_AGENT = 'Lodgra'

const baseHeaders = (apiKey: string, json = false): Record<string, string> => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  access_token: apiKey,
  'User-Agent': USER_AGENT,
})

const getBaseUrl = (isProduction: boolean) => 
  isProduction ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

export const asaas = {
  async createCustomer(apiKey: string, isProduction: boolean, name: string, email: string) {
    const response = await fetch(`${getBaseUrl(isProduction)}/customers`, {
      method: 'POST',
      headers: baseHeaders(apiKey, true),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ name, email })
    });
    return response.json();
  },

  async createPayment(apiKey: string, isProduction: boolean, payload: AsaasPaymentRequest) {
    const response = await fetch(`${getBaseUrl(isProduction)}/payments`, {
      method: 'POST',
      headers: baseHeaders(apiKey, true),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async getPixQrCode(apiKey: string, isProduction: boolean, paymentId: string) {
    const response = await fetch(`${getBaseUrl(isProduction)}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers: baseHeaders(apiKey),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return response.json();
  }
};
