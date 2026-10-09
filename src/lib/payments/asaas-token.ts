import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Segredo do webhook do Asaas: aleatório, distinto da chave de API. */
export function generateWebhookToken(): string {
  return randomBytes(32).toString('hex')
}

/** Comparação em tempo constante; compara digests para não vazar o tamanho. */
export function tokensMatch(expected: string | null | undefined, received: string | null | undefined): boolean {
  if (!expected || !received) return false
  const a = createHash('sha256').update(expected).digest()
  const b = createHash('sha256').update(received).digest()
  return timingSafeEqual(a, b)
}

export function lastFour(secret: string | null | undefined): string | null {
  return secret && secret.length >= 4 ? secret.slice(-4) : null
}
