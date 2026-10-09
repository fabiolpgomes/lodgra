'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Receipt, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import {
  CASH_FLOW_OPTIONS,
  CLEANING_OPTIONS,
  PRESET_OPTIONS,
  RECOGNITION_OPTIONS,
  financialDefaultsSchema,
  type FinancialDefaultsInput,
} from '@/lib/financial/financial-defaults'

interface Props {
  initial: FinancialDefaultsInput | null
}

const INITIAL: FinancialDefaultsInput = {
  preset: 'net_received',
  competenciaReceita: 'check_out',
  fluxoFinanceiro: 'manager_trust',
  destinatarioLimpeza: 'manager',
}

type Option = { readonly value: string; readonly label: string }

function Field({ id, label, value, options, onChange }: {
  id: string
  label: string
  value: string
  options: ReadonlyArray<Option>
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-brand-text-medium">{label}</label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-brand-text-dark"
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )
}

export function FinancialDefaultsSettings({ initial }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<FinancialDefaultsInput>(initial ?? INITIAL)
  const [saving, setSaving] = useState(false)
  const unchanged = initial !== null && JSON.stringify(initial) === JSON.stringify(values)

  async function handleSave() {
    const parsed = financialDefaultsSchema.safeParse(values)
    if (!parsed.success) {
      toast.error('Predefinições inválidas.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/organization/financial-defaults', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? 'Não foi possível guardar.')
      }
      toast.success('Predefinições de repasse guardadas.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-brand-blue" />
        <h2 className="text-lg font-semibold text-brand-text-dark">Predefinições de repasse</h2>
      </div>
      <p className="text-sm text-brand-text-medium">
        Valores iniciais ao criar o contrato de uma propriedade. Não alteram contratos já existentes e podem ser ajustados em cada propriedade.
        {initial === null && ' Ainda não configurado: é necessário para criar o primeiro contrato.'}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="fd-preset" label="Base da comissão" value={values.preset} options={PRESET_OPTIONS}
          onChange={value => setValues(current => ({ ...current, preset: value as FinancialDefaultsInput['preset'] }))} />
        <Field id="fd-recognition" label="Mês em que a receita conta" value={values.competenciaReceita} options={RECOGNITION_OPTIONS}
          onChange={value => setValues(current => ({ ...current, competenciaReceita: value as FinancialDefaultsInput['competenciaReceita'] }))} />
        <Field id="fd-flow" label="Fluxo do dinheiro" value={values.fluxoFinanceiro} options={CASH_FLOW_OPTIONS}
          onChange={value => setValues(current => ({ ...current, fluxoFinanceiro: value as FinancialDefaultsInput['fluxoFinanceiro'] }))} />
        <Field id="fd-cleaning" label="Taxa de limpeza fica com" value={values.destinatarioLimpeza} options={CLEANING_OPTIONS}
          onChange={value => setValues(current => ({ ...current, destinatarioLimpeza: value as FinancialDefaultsInput['destinatarioLimpeza'] }))} />
      </div>
      <p className="text-xs text-brand-text-medium">A taxa municipal é sempre repassada ao município.</p>
      <Button type="button" onClick={() => void handleSave()} disabled={saving || unchanged}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar
      </Button>
    </div>
  )
}
