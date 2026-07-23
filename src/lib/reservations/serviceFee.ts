/**
 * Story 39.1 — Fundação de Dados (Dashboard Analytics)
 *
 * Calcula o snapshot de `reservations.service_fee_amount` no momento da
 * criação da reserva, a partir dos valores-base cadastrados na propriedade
 * (`properties.cleaning_fee` / `properties.pet_fee`).
 *
 * IMPORTANTE: o valor retornado deve ser copiado para a reserva na criação,
 * não recalculado depois — se o valor-base da propriedade mudar, reservas
 * já criadas mantêm o valor que tinham no momento da criação.
 */

export type FeeType = 'per_stay' | 'per_night' | string | null | undefined

export interface PropertyFeeInfo {
  cleaning_fee?: number | null
  cleaning_fee_type?: FeeType
  pet_fee?: number | null
  pet_fee_type?: FeeType
}

/**
 * Soma as taxas de serviço aplicáveis (limpeza + animais) de uma propriedade
 * para uma estadia de `nights` noites, respeitando `per_stay` (cobrada uma
 * única vez) vs `per_night` (multiplicada pelo número de noites).
 *
 * Retorna 0 quando a propriedade não tem taxas configuradas, quando
 * `property` é nulo/indefinido, ou quando `nights` é inválido (<= 0).
 */
export function calculateServiceFeeAmount(
  property: PropertyFeeInfo | null | undefined,
  nights: number
): number {
  if (!property || !Number.isFinite(nights) || nights <= 0) {
    return 0
  }

  const cleaningFee = property.cleaning_fee ?? 0
  const petFee = property.pet_fee ?? 0

  const cleaningTotal =
    cleaningFee > 0
      ? property.cleaning_fee_type === 'per_night'
        ? cleaningFee * nights
        : cleaningFee
      : 0

  const petTotal =
    petFee > 0
      ? property.pet_fee_type === 'per_night'
        ? petFee * nights
        : petFee
      : 0

  // Evitar imprecisão de ponto flutuante (ex.: 0.1 + 0.2)
  return Math.round((cleaningTotal + petTotal) * 100) / 100
}

/**
 * Calcula o número de noites entre check-in e check-out (datas YYYY-MM-DD
 * ou Date). Retorna 0 se as datas forem ausentes/inválidas ou check-out <= check-in.
 *
 * Aceita `null`/`undefined` deliberadamente — várias fontes de criação de
 * reserva (ex.: email parser) podem não ter uma das datas ainda.
 */
export function nightsBetween(
  checkIn: string | Date | null | undefined,
  checkOut: string | Date | null | undefined
): number {
  if (!checkIn || !checkOut) {
    return 0
  }

  const start = typeof checkIn === 'string' ? new Date(checkIn) : checkIn
  const end = typeof checkOut === 'string' ? new Date(checkOut) : checkOut

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }

  const diffMs = end.getTime() - start.getTime()
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return nights > 0 ? nights : 0
}
