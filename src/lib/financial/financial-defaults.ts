import { z } from 'zod'

/**
 * Predefinições financeiras da organização (organization_financial_settings).
 * Só preenchem o formulário de um contrato novo; nunca reescrevem regras já gravadas.
 * "custom" existe na base mas não faz sentido como predefinição (não traz componentes), por isso não é aceite aqui.
 */
export const financialDefaultsSchema = z.object({
  preset: z.enum(['net_received', 'gross_reservation']),
  competenciaReceita: z.enum(['check_in', 'check_out', 'stay_prorata', 'payout_date']),
  fluxoFinanceiro: z.enum(['manager_trust', 'owner_direct']),
  destinatarioLimpeza: z.enum(['manager', 'owner', 'third_party']),
}).strict()

export type FinancialDefaultsInput = z.infer<typeof financialDefaultsSchema>

export const PRESET_OPTIONS: ReadonlyArray<{ value: FinancialDefaultsInput['preset']; label: string }> = [
  { value: 'net_received', label: 'Comissão sobre o líquido recebido' },
  { value: 'gross_reservation', label: 'Comissão sobre o valor bruto da reserva' },
]

export const RECOGNITION_OPTIONS: ReadonlyArray<{ value: FinancialDefaultsInput['competenciaReceita']; label: string }> = [
  { value: 'check_out', label: 'Mês do check-out' },
  { value: 'check_in', label: 'Mês do check-in' },
  { value: 'stay_prorata', label: 'Proporcional às noites de cada mês' },
  { value: 'payout_date', label: 'Mês do pagamento' },
]

export const CASH_FLOW_OPTIONS: ReadonlyArray<{ value: FinancialDefaultsInput['fluxoFinanceiro']; label: string }> = [
  { value: 'manager_trust', label: 'O dinheiro passa pelo gestor, que repassa ao proprietário' },
  { value: 'owner_direct', label: 'O dinheiro vai direto ao proprietário' },
]

export const CLEANING_OPTIONS: ReadonlyArray<{ value: FinancialDefaultsInput['destinatarioLimpeza']; label: string }> = [
  { value: 'manager', label: 'Gestor' },
  { value: 'owner', label: 'Proprietário' },
  { value: 'third_party', label: 'Terceiro' },
]
