'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import type { FeeType, PropertyFees } from '@/lib/properties/fees'

// Taxas cobradas no checkout das reservas diretas. Único sítio onde se configuram.

interface TaxesCardProps {
  propertyId: string
  onUpdate?: () => void
}

type FeeKey = 'cleaning' | 'pet'
type FormState = Record<FeeKey, { amount: string; type: FeeType }>

const FEE_LABELS: Record<FeeKey, string> = { cleaning: 'Limpeza', pet: 'Animais de estimação' }
const TYPE_LABELS: Record<FeeType, string> = { per_stay: 'por estadia', per_night: 'por noite' }

const EMPTY: PropertyFees = { cleaningFee: null, cleaningFeeType: null, petFee: null, petFeeType: null }

function toForm(fees: PropertyFees): FormState {
  return {
    cleaning: { amount: fees.cleaningFee?.toString() ?? '', type: fees.cleaningFeeType ?? 'per_stay' },
    pet: { amount: fees.petFee?.toString() ?? '', type: fees.petFeeType ?? 'per_stay' },
  }
}

export function TaxesCard({ propertyId, onUpdate }: TaxesCardProps) {
  const [fees, setFees] = useState<PropertyFees>(EMPTY)
  const [currency, setCurrency] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<FormState>(toForm(EMPTY))

  const formatAmount = useCallback(
    (value: number) => {
      try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: (currency || 'EUR').toUpperCase() }).format(value)
      } catch {
        return value.toFixed(2)
      }
    },
    [currency]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const response = await fetch(`/api/properties/${propertyId}/fees`, { credentials: 'include' })
        if (!response.ok) throw new Error(`Failed to load fees (${response.status})`)
        const json = await response.json()
        if (!cancelled && json.success) {
          const { currency: cur, ...rest } = json.data
          setFees(rest as PropertyFees)
          setCurrency(cur ?? null)
        }
      } catch (error) {
        console.error('Error loading fees:', error)
        if (!cancelled) toast.error('Não foi possível carregar as taxas')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const openDialog = () => {
    setForm(toForm(fees))
    setShowDialog(true)
  }

  const update = (key: FeeKey, patch: Partial<FormState[FeeKey]>) =>
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

  const handleSave = async () => {
    const parse = (raw: string) => (raw.trim() === '' ? null : Number(raw.replace(',', '.')))
    const cleaningFee = parse(form.cleaning.amount)
    const petFee = parse(form.pet.amount)
    if ([cleaningFee, petFee].some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
      toast.error('Indique um valor válido (ou deixe vazio para não cobrar)')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/properties/${propertyId}/fees`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cleaningFee,
          cleaningFeeType: form.cleaning.type,
          petFee,
          petFeeType: form.pet.type,
        }),
      })
      const json = await response.json().catch(() => null)
      if (response.ok && json?.success) {
        const { currency: cur, ...rest } = json.data
        setFees(rest as PropertyFees)
        setCurrency(cur ?? currency)
        setShowDialog(false)
        toast.success('Taxas atualizadas')
        onUpdate?.()
      } else {
        toast.error(json?.error || 'Erro ao guardar as taxas')
      }
    } catch (error) {
      console.error('Error saving fees:', error)
      toast.error('Erro ao guardar as taxas')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-4 md:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#1B2430]">Taxas</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-[#E5DFD2] rounded"></div>
        </div>
      </Card>
    )
  }

  const rows: { key: FeeKey; amount: number | null; type: FeeType | null }[] = [
    { key: 'cleaning', amount: fees.cleaningFee, type: fees.cleaningFeeType },
    { key: 'pet', amount: fees.petFee, type: fees.petFeeType },
  ]

  return (
    <>
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-[#1B2430]">Taxas</h3>
          <Button onClick={openDialog} variant="outline" size="sm" className="h-10 w-full sm:w-auto">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between p-3 bg-[#F7F5EF] rounded-lg">
              <p className="font-medium text-sm text-[#1B2430]">{FEE_LABELS[row.key]}</p>
              <p className="text-sm text-[#4D5566]">
                {row.amount ? `${formatAmount(row.amount)} ${TYPE_LABELS[row.type ?? 'per_stay']}` : 'Sem taxa'}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#4D5566]">Estes valores são somados ao total pago pelo hóspede nas reservas diretas.</p>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[calc(100%_-_1rem)] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-[#1B2430]">Taxas da reserva</DialogTitle>
            <DialogDescription className="text-[#4D5566]">
              Cobradas no pagamento das reservas diretas. Deixe vazio para não cobrar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(Object.keys(FEE_LABELS) as FeeKey[]).map((key) => (
              <div key={key} className="space-y-2 p-3 bg-[#F7F5EF] rounded-lg">
                <Label className="text-xs block text-[#1B2430]">
                  {FEE_LABELS[key]} {currency ? `(${currency.toUpperCase()})` : ''}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={form[key].amount}
                    onChange={(e) => update(key, { amount: e.target.value })}
                    placeholder="0.00"
                    className="h-10 flex-1 text-sm"
                  />
                  <Select value={form[key].type} onValueChange={(v) => update(key, { type: v as FeeType })}>
                    <SelectTrigger className="h-10 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_stay">Por estadia</SelectItem>
                      <SelectItem value="per_night">Por noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="h-12 w-full flex-1 text-[#1B2430] border-[#E5DFD2] sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 w-full flex-1 text-base font-semibold bg-[#10203E] hover:bg-[#0D1A2E] sm:w-auto"
            >
              {saving ? 'A guardar…' : 'Guardar taxas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
