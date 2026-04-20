export interface AsaasPaymentRequest {
  customer: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}

const getBaseUrl = (isProduction: boolean) => 
  isProduction ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

export const asaas = {
  async createCustomer(apiKey: string, isProduction: boolean, name: string, email: string) {
    const response = await fetch(`${getBaseUrl(isProduction)}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify({ name, email })
    });
    return response.json();
  },

  async createPayment(apiKey: string, isProduction: boolean, payload: AsaasPaymentRequest) {
    const response = await fetch(`${getBaseUrl(isProduction)}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey
      },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async getPixQrCode(apiKey: string, isProduction: boolean, paymentId: string) {
    const response = await fetch(`${getBaseUrl(isProduction)}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'access_token': apiKey
      }
    });
    return response.json();
  }
};
