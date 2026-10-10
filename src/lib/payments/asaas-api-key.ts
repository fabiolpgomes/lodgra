/**
 * Valida o formato da chave de API do Asaas antes de a guardar.
 * Chaves reais começam por "$aact_" ("$aact_hmlg_" no sandbox, "$aact_prod_" em produção).
 * Apanha o erro típico de colar outra coisa (ex.: a chave Pix, que é um UUID).
 * Devolve a mensagem de erro, ou null se estiver bem.
 */
export function validateAsaasApiKey(apiKey: string, environment: 'sandbox' | 'production'): string | null {
  if (!apiKey.startsWith('$aact_')) {
    return 'Esta não parece uma chave de API do Asaas: ela começa por $aact_. Não use a chave Pix.'
  }
  if (environment === 'production' && apiKey.startsWith('$aact_hmlg_')) {
    return 'Esta é uma chave de teste (sandbox), mas o ambiente escolhido é Produção.'
  }
  if (environment === 'sandbox' && apiKey.startsWith('$aact_prod_')) {
    return 'Esta é uma chave de produção, mas o ambiente escolhido é Sandbox.'
  }
  return null
}
