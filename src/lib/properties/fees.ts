// Taxas da propriedade cobradas na reserva direta (checkout).
// Fonte única: colunas cleaning_fee/pet_fee em properties, editadas no cartão "Taxas" do calendário.

export type FeeType = 'per_stay' | 'per_night'

export interface PropertyFees {
  cleaningFee: number | null
  cleaningFeeType: FeeType | null
  petFee: number | null
  petFeeType: FeeType | null
}

export type FeesColumns = {
  cleaning_fee: number | null
  cleaning_fee_type: FeeType | null
  pet_fee: number | null
  pet_fee_type: FeeType | null
}

const FEE_TYPES: FeeType[] = ['per_stay', 'per_night']

function parseFee(amount: unknown, type: unknown, label: string): { amount: number | null; type: FeeType | null } {
  if (amount === null || amount === undefined || amount === '') return { amount: null, type: null }
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label}: valor inválido`)
  if (value === 0) return { amount: null, type: null }
  const feeType = (type ?? 'per_stay') as FeeType
  if (!FEE_TYPES.includes(feeType)) throw new Error(`${label}: tipo inválido`)
  return { amount: Math.round(value * 100) / 100, type: feeType }
}

/** Valida o pedido do cartão Taxas e devolve as colunas a gravar. Vazio ou 0 = sem taxa. */
export function feesToColumns(input: Partial<PropertyFees>): FeesColumns {
  const cleaning = parseFee(input.cleaningFee, input.cleaningFeeType, 'Taxa de limpeza')
  const pet = parseFee(input.petFee, input.petFeeType, 'Taxa de animais')
  return {
    cleaning_fee: cleaning.amount,
    cleaning_fee_type: cleaning.type,
    pet_fee: pet.amount,
    pet_fee_type: pet.type,
  }
}

export function columnsToFees(row: Partial<Record<keyof FeesColumns, unknown>>): PropertyFees {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
  return {
    cleaningFee: num(row.cleaning_fee),
    cleaningFeeType: (row.cleaning_fee_type as FeeType | null) ?? null,
    petFee: num(row.pet_fee),
    petFeeType: (row.pet_fee_type as FeeType | null) ?? null,
  }
}
